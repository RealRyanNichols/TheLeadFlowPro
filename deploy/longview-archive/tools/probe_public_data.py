"""Measure Longview against the real public sources, printing counts only.

Run from a machine that can reach data.texas.gov (a GitHub Actions runner):

    cd deploy/longview-archive && python3 tools/probe_public_data.py

It runs the engine's own sync -> match -> publish on a throwaway data folder,
then counts what other public datasets would add, and checks where the website
and the directory answer from. It prints dataset ids, column names and counts.
It never prints a business name, an address, a phone or a taxpayer number: the
log of a public repository is public. It reads no business website and sends
nothing anywhere.
"""
from __future__ import annotations

import json
import os
import socket
import sys
import tempfile
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from longview_archive import config, db, matching, publish  # noqa: E402
from longview_archive.service import SYNC_JOBS, bootstrap, run_sync  # noqa: E402
from longview_archive.sources import http as api_http  # noqa: E402

DROPLET_IP = "165.227.248.110"
CITY_COLUMNS = ("outlet_city", "taxpayer_city", "city", "location_city", "physical_city", "business_city",
                "facility_city", "site_city", "loc_city", "mailing_city", "address_city", "operation_city")
CATALOG_QUERIES = ("sales tax permit", "franchise tax permit", "mixed beverage", "TABC license", "TDLR license",
                   "child care operations", "day care", "food establishment", "sexually oriented",
                   "insurance agency", "motor vehicle dealer", "pharmacy", "nursing facility")


def say(text: str = "") -> None:
    print(text, flush=True)


def numbers(counts) -> dict:
    return {k: v for k, v in sorted((counts or {}).items()) if isinstance(v, int) and not isinstance(v, bool)}


def engine_run(settings) -> None:
    say("== 1. The engine's own sync -> match -> publish against the live sources")
    conn = bootstrap(settings)
    for job in SYNC_JOBS:
        outcome = run_sync(conn, settings, job, db.now_iso())
        say(f"sync {job.name}: {outcome.status} {numbers(outcome.counts)}"
            + (f" error={outcome.error}" if outcome.error else ""))
    say(f"match: {numbers(matching.match_pending(conn))}")
    counts = publish.run_publish(conn, settings)
    say(f"publish: {numbers(counts)}")
    for row in conn.execute("SELECT scope, publish_state, IFNULL(publish_reason,'') AS reason, COUNT(*) AS n"
                            " FROM businesses GROUP BY 1,2,3 ORDER BY 1,2,4 DESC"):
        say(f"  scope={row['scope']} state={row['publish_state']} reason={row['reason'] or '-'}: {row['n']}")
    shown = conn.execute("SELECT COUNT(*) FROM businesses WHERE publish_state='ready'").fetchone()[0]
    say(f"PROFILES READY TO PUBLISH (first batch): {shown}")
    conn.close()


def catalog(settings, query: str):
    base = settings.socrata_base.rstrip("/")
    host = base.split("//", 1)[-1]
    data = api_http.get_json(f"{base}/api/catalog/v1", settings,
                             params={"q": query, "only": "dataset", "domains": host, "limit": 8}) or {}
    return data.get("results") or []


def count_where(settings, dataset_id: str, where: str):
    base = settings.socrata_base.rstrip("/")
    rows = api_http.get_json(f"{base}/resource/{dataset_id}.json", settings,
                             params={"$select": "count(*) AS n", "$where": where}) or []
    try:
        return int(rows[0]["n"])
    except (IndexError, KeyError, TypeError, ValueError):
        return None


def other_sources(settings) -> None:
    say()
    say("== 2. Other public datasets on data.texas.gov with a Longview city column (counts only)")
    seen = set()
    for query in CATALOG_QUERIES:
        try:
            results = catalog(settings, query)
        except Exception as exc:  # noqa: BLE001
            say(f"catalog {query!r}: {type(exc).__name__}")
            continue
        for result in results:
            resource = result.get("resource") or {}
            rid, name = str(resource.get("id") or ""), str(resource.get("name") or "")
            if not rid or rid in seen:
                continue
            seen.add(rid)
            columns = [str(c) for c in resource.get("columns_field_name") or []]
            city = next((c for c in columns if c.lower() in CITY_COLUMNS), None)
            if not city:
                continue
            try:
                n = count_where(settings, rid, f"upper({city})='LONGVIEW'")
            except Exception as exc:  # noqa: BLE001
                n = type(exc).__name__
            say(f"[{query}] {rid} {name!r} updated={resource.get('updatedAt')} city_col={city} longview_rows={n}")
            say(f"    columns: {', '.join(columns)}")


def franchise_overlap(settings) -> None:
    say()
    say("== 3. Franchise tax (companies) in Longview that have no Longview sales-tax outlet")
    try:
        results = catalog(settings, "active franchise tax permit holders")
    except Exception as exc:  # noqa: BLE001
        say(f"catalog: {type(exc).__name__}")
        return
    franchise = next((r["resource"] for r in results if "franchise" in str(r.get("resource", {}).get("name", "")).lower()
                      and "taxpayer_number" in (r.get("resource", {}).get("columns_field_name") or [])), None)
    sales = next((r["resource"] for r in catalog(settings, "active sales tax permit holders")
                  if "sales tax" in str(r.get("resource", {}).get("name", "")).lower()), None)
    if not franchise or not sales:
        say(f"franchise dataset found={bool(franchise)} sales dataset found={bool(sales)}")
        return
    from longview_archive.sources import socrata
    fcols = {c.lower() for c in franchise.get("columns_field_name") or []}
    fcity = next((c for c in ("taxpayer_city", "city") if c in fcols), None)
    say(f"franchise dataset {franchise['id']} {franchise.get('name')!r} city column={fcity}")
    if not fcity:
        return
    f_numbers = {str(r.get("taxpayer_number")) for r in socrata.fetch_rows(
        settings, franchise["id"], f"upper({fcity})='LONGVIEW'", select="taxpayer_number")}
    s_numbers = {str(r.get("taxpayer_number")) for r in socrata.fetch_rows(
        settings, sales["id"], "upper(outlet_city)='LONGVIEW'", select="taxpayer_number")}
    say(f"franchise taxpayers with a Longview address: {len(f_numbers)}")
    say(f"sales-tax taxpayers with a Longview outlet: {len(s_numbers)}")
    say(f"franchise taxpayers in Longview with NO Longview sales-tax outlet: {len(f_numbers - s_numbers)}")
    if "taxpayer_zip" in fcols:
        zips = Counter(str(r.get("taxpayer_zip") or "")[:5] for r in socrata.fetch_rows(
            settings, franchise["id"], f"upper({fcity})='LONGVIEW'", select="taxpayer_zip"))
        say(f"franchise Longview rows by ZIP: {dict(zips.most_common(8))}")


def where_things_answer() -> None:
    say()
    say("== 4. Where the website and the directory answer from")
    for host in ("theleadflowpro.com", "www.theleadflowpro.com", "longview.165-227-248-110.sslip.io"):
        try:
            ips = sorted({ai[4][0] for ai in socket.getaddrinfo(host, 443, socket.AF_INET)})
        except OSError as exc:
            ips = [f"error {exc.__class__.__name__}"]
        say(f"{host} -> {ips}{'  (the droplet)' if DROPLET_IP in ips else ''}")
    import urllib.request
    for url in ("https://www.theleadflowpro.com/", "https://longview.165-227-248-110.sslip.io/status/status.json",
                "https://longview.165-227-248-110.sslip.io/longview/businesses/"):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT}),
                                        timeout=20) as resp:
                server = resp.headers.get("server")
                vercel = "x-vercel-id" in {k.lower() for k in resp.headers.keys()}
                body = resp.read(200_000)
                say(f"{url}: HTTP {resp.status} server={server} vercel={vercel}")
                if url.endswith("status.json"):
                    data = json.loads(body.decode("utf-8", "replace"))
                    flat = {k: v for k, v in data.items() if isinstance(v, (int, float)) and not isinstance(v, bool)}
                    say(f"    status counts: {flat}")
        except Exception as exc:  # noqa: BLE001
            say(f"{url}: {exc.__class__.__name__} {getattr(exc, 'code', '')}")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["LVA_DATA_DIR"] = tmp
        settings = config.load_settings(os.environ)
        for step in (engine_run, other_sources, franchise_overlap):
            try:
                step(settings)
            except Exception as exc:  # noqa: BLE001 - report and keep going
                say(f"{step.__name__} failed: {exc.__class__.__name__}: {str(exc)[:300]}")
    where_things_answer()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
