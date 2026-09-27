"""Socrata (data.texas.gov) discovery and paging.

Dataset IDs on data.texas.gov change when a publisher re-issues a dataset, so
the adapters never hard-code one: they search the catalog by name, prefer the
candidate whose columns fit, and read the column list and licence from the
dataset's own metadata. When a required column is missing the sync stops and
says which columns it found; it never guesses a substitute. Column names are
schema, not personal data, so they may be stored and logged.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterator, List, Mapping, Optional, Sequence, Tuple, Union
from urllib.parse import urlsplit

from .http import SourceError, Transport, get_json

logger = logging.getLogger(__name__)

_DATASET_ID = re.compile(r"^[a-z0-9]{4}-[a-z0-9]{4}$")

ColumnGroup = Union[str, Sequence[str]]


@dataclass(frozen=True)
class DatasetInfo:
    id: str
    name: str
    url: str
    license: str
    columns: Tuple[str, ...]
    updated_at: Optional[str]


class DatasetNotFound(SourceError):
    def __init__(self, query: str):
        self.query = query
        super().__init__(f"no_dataset: nothing in the catalog matched {query!r}")


class SchemaMismatch(SourceError):
    def __init__(self, missing: Sequence[str], columns: Sequence[str], candidates: Optional[Mapping[str, Sequence[str]]] = None):
        self.missing = list(missing)
        self.columns = list(columns)
        wanted = ", ".join(
            f"{name} ({'|'.join(candidates[name])})" if candidates and name in candidates else name
            for name in self.missing
        )
        super().__init__(
            f"schema_mismatch: missing {wanted}; columns found: {', '.join(self.columns) or '(none)'}"
        )


def _base(settings) -> str:
    return settings.socrata_base.rstrip("/")


def _groups(required_columns: Sequence[ColumnGroup]) -> List[Tuple[str, ...]]:
    return [(group,) if isinstance(group, str) else tuple(group) for group in required_columns or ()]


def _iso_from_epoch(value: Any) -> Optional[str]:
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (TypeError, ValueError, OverflowError, OSError):
        return None


def discover_dataset(
    settings,
    query: str,
    name_pattern: str,
    required_columns: Sequence[ColumnGroup],
    transport: Optional[Transport] = None,
) -> DatasetInfo:
    """Find the dataset by catalog search; its columns and licence come from its own metadata."""
    base = _base(settings)
    host = (urlsplit(base).hostname or "").lower()
    catalog = get_json(
        f"{base}/api/catalog/v1",
        settings,
        params={"q": query, "only": "dataset", "domains": host, "limit": 50},
        transport=transport,
    )
    pattern = re.compile(name_pattern, re.IGNORECASE)
    groups = _groups(required_columns)
    best = None
    for result in (catalog or {}).get("results", []) if isinstance(catalog, dict) else []:
        resource = result.get("resource") or {}
        domain = ((result.get("metadata") or {}).get("domain") or "").lower()
        rid = str(resource.get("id") or "")
        rtype = resource.get("type")
        name = str(resource.get("name") or "")
        if domain != host or not _DATASET_ID.match(rid) or (rtype and rtype != "dataset"):
            continue
        if not pattern.search(name):
            continue
        fields = {str(c).lower() for c in resource.get("columns_field_name") or []}
        satisfied = sum(1 for group in groups if any(c.lower() in fields for c in group))
        rank = (satisfied == len(groups), satisfied, str(resource.get("updatedAt") or ""))
        if best is None or rank > best[0]:
            best = (rank, rid, name, resource)
    if best is None:
        raise DatasetNotFound(query)
    _, dataset_id, name, resource = best

    view = get_json(f"{base}/api/views/{dataset_id}.json", settings, transport=transport) or {}
    columns = tuple(
        str(col["fieldName"]) for col in view.get("columns") or [] if isinstance(col, dict) and col.get("fieldName")
    ) or tuple(str(c) for c in resource.get("columns_field_name") or [])
    licence = (view.get("license") or {}).get("name") if isinstance(view.get("license"), dict) else None
    licence = licence or view.get("licenseId") or "See dataset page"
    updated = resource.get("updatedAt") or _iso_from_epoch(view.get("rowsUpdatedAt"))
    info = DatasetInfo(
        id=dataset_id,
        name=str(view.get("name") or name),
        url=f"{base}/d/{dataset_id}",
        license=str(licence),
        columns=columns,
        updated_at=str(updated) if updated else None,
    )
    logger.info("socrata dataset found id=%s columns=%d", info.id, len(info.columns))
    return info


def resolve_fields(
    columns: Sequence[str],
    candidates: Mapping[str, Sequence[str]],
    required: Sequence[str],
) -> Dict[str, Optional[str]]:
    """Logical field -> the first candidate column present; missing required -> SchemaMismatch."""
    present = {str(c).lower(): str(c) for c in columns}
    resolved: Dict[str, Optional[str]] = {}
    for logical, names in candidates.items():
        resolved[logical] = next((present[n.lower()] for n in names if n.lower() in present), None)
    missing = [logical for logical in required if not resolved.get(logical)]
    if missing:
        raise SchemaMismatch(missing, list(columns), candidates)
    return resolved


def fetch_rows(
    settings,
    dataset_id: str,
    where: Optional[str],
    order: str = ":id",
    page_size: int = 5000,
    transport: Optional[Transport] = None,
    select: Optional[str] = None,
) -> Iterator[Dict[str, Any]]:
    """Yield rows page by page until a short page."""
    if not _DATASET_ID.match(dataset_id or ""):
        raise ValueError("not a Socrata dataset id")
    url = f"{_base(settings)}/resource/{dataset_id}.json"
    offset = 0
    while True:
        params: Dict[str, Any] = {}
        if select:
            params["$select"] = select
        if where:
            params["$where"] = where
        params.update({"$order": order, "$limit": page_size, "$offset": offset})
        page = get_json(url, settings, params=params, transport=transport)
        if not isinstance(page, list):
            raise SourceError("unexpected_payload: resource rows were not a list")
        for row in page:
            if isinstance(row, dict):
                yield row
        if len(page) < page_size:
            return
        offset += page_size
