"""Batch pull requests: the engine opens (or updates) one pull request per batch.

Off unless a GitHub token file exists (``settings.github_token_file``, by
default ``/etc/longview-archive/github-token``). When it is on, after a publish
export is written the engine compares it with the directory file on ``main``
and, when it changed, puts it on the branch ``longview-directory/batch`` as one
commit on top of ``main`` and opens a ready-for-review pull request against
``main`` (or updates the one already open). The owner looks at the Vercel
preview and merges; merging stays the approval.

What this module can do on GitHub is fixed by an allowlist of endpoints
(``ALLOWED``): read refs, commits, trees, and blobs; write one blob, one tree
that changes only ``content/longview-directory/directory.json``, one commit,
and the ``longview-directory/batch`` ref; list, open, and edit pull requests
from that branch. It never merges, never approves or reviews, never writes to
``main`` or any other branch, and never touches any other file. At most one
batch pull request is open at a time, and it is updated at most once every
``publish_pr_every_s`` (24 hours by default).

Safety rules, checked before any write: skip when the export is the same as
``main``'s file (ignoring ``generatedAt`` and ``batchId``), when it is a sample,
or when it has no businesses; hold (an error run and a status-page error) when
it would remove more than 25% of the businesses published on ``main``.

The token is read from the file for each run, sent only to
https://api.github.com in the Authorization header, and never logged, stored,
or put in an error message. Errors name an endpoint and an HTTP status only.
The pull request body lists business names and categories only for businesses
that are ready to publish (added) or were already public on ``main`` and are
not held, suppressed, or waiting for review (removed).
"""

from __future__ import annotations

import base64
import fcntl
import http.client
import json
import logging
import os
import re
import stat
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Set, Tuple
from urllib.parse import quote, urlsplit

from . import db, publish
from .categories import CATEGORY_NAMES

log = logging.getLogger(__name__)

API_HOST = "api.github.com"
API_ROOT = "https://" + API_HOST
API_VERSION = "2022-11-28"
BASE_BRANCH = "main"
BATCH_BRANCH = "longview-directory/batch"
FILE_PATH = "content/longview-directory/directory.json"
COMMIT_AUTHOR = {"name": "LeadFlow Longview Archive", "email": "hello@theleadflowpro.com"}
RUN_KIND = "publish_pr"

MAX_REMOVAL_SHARE = 0.25          # more than this share of main's businesses removed: held for a person
MAX_NAMES = 50                    # added and removed names listed in the body, each
RETRY_AFTER_ERROR_S = 3600        # a failed GitHub call is tried again after this
PROBLEM_REPEAT_S = 86_400         # the same refusal is recorded as a new error run at most this often
MAX_BODY_BYTES = 64 * 1024 * 1024
LOCK_NAME = "publish-pr.lock"
HIDDEN_STATES = ("held", "suppressed", "review")

META_LAST = "publish_pr_last_at"          # when the last pull request was opened or updated
META_LAST_COUNTS = "publish_pr_last_counts"
META_LAST_ACTION = "publish_pr_last_action"
META_HOLD = "publish_pr_hold_until"       # after an error: not before this
META_PROBLEM = "publish_pr_problem"       # code of the refusal last recorded
META_PROBLEM_AT = "publish_pr_problem_at"
META_CHECKED = "publish_pr_checked_at"

_TOKEN = re.compile(r"[A-Za-z0-9_]{20,255}")
_SHA = r"[0-9a-f]{40}"
_REPO = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})/[A-Za-z0-9._-]{1,100}")

# (method, url, headers, body, timeout) -> (status, headers, body); the same shape as sources/http.py.
Transport = Callable[[str, str, Dict[str, str], Optional[bytes], float], Tuple[int, Mapping[str, str], bytes]]


# ---------------------------------------------------------------- errors

class GitHubError(Exception):
    """A GitHub call that failed. The message names the step and a status only, never the token."""

    def __init__(self, status: int, step: str, reason: str = ""):
        self.status = int(status)
        self.step = step
        self.reason = reason or (f"http_{status}" if status else "network")
        super().__init__(f"{API_HOST} {self.status}: {self.reason} ({step})")


class NotAllowed(Exception):
    """A call outside the allowlist. Always a bug; nothing is sent."""


def describe_error(exc: GitHubError) -> str:
    hints = {
        401: "the token is wrong or expired; make a new one",
        403: "the token lacks permission (Contents and Pull requests: read and write) or hit a rate limit",
        404: "the repository or branch was not found with this token",
        422: "GitHub refused the change",
    }
    hint = hints.get(exc.status)
    if exc.status == 0:
        hint = "could not reach GitHub"
    return f"GitHub {exc.step}: {exc.reason}" + (f" ({hint})" if hint else "")


# ---------------------------------------------------------------- token file

@dataclass(frozen=True)
class TokenState:
    status: str                       # off | ok | refused
    problem: Optional[str] = None     # plain text for the owner
    code: Optional[str] = None        # short code for de-duplicating error runs
    token: Optional[str] = None

    @property
    def enabled(self) -> bool:
        return self.status == "ok"

    def __repr__(self) -> str:        # never show the token
        return f"TokenState(status={self.status!r}, code={self.code!r})"


def read_token(settings) -> TokenState:
    """The token and whether batch pull requests are on.

    No file: off. A file that is not a regular file, that anyone other than its
    owner and group can read or write, that this process cannot read, or that
    does not hold one token: refused, with a plain reason.
    """
    path = Path(settings.github_token_file)
    try:
        info = os.lstat(path)
    except FileNotFoundError:
        return TokenState("off")
    except OSError:
        return TokenState("refused", f"The GitHub token file {path} cannot be checked. Batch pull requests are off.",
                          "token_unreadable")
    if not stat.S_ISREG(info.st_mode):
        return TokenState("refused", f"The GitHub token file {path} is not a plain file (a link or a folder)."
                                     " Batch pull requests are off.", "token_not_file")
    if info.st_mode & 0o007:
        return TokenState("refused", f"The GitHub token file {path} can be read by everyone on the droplet."
                                     f" Batch pull requests are off until it is fixed: chmod 0640 {path}",
                          "token_world_readable")
    try:
        with open(path, "r", encoding="ascii") as fh:
            text = fh.read(4096)
    except PermissionError:
        return TokenState("refused", f"The GitHub token file {path} is not readable by the service user"
                                     f" lvarchive. Fix it with: chown root:lvarchive {path} && chmod 0640 {path}",
                          "token_not_readable")
    except (OSError, UnicodeDecodeError):
        return TokenState("refused", f"The GitHub token file {path} cannot be read. Batch pull requests are off.",
                          "token_unreadable")
    token = text.strip()
    if not _TOKEN.fullmatch(token):
        return TokenState("refused", f"The GitHub token file {path} does not hold one GitHub token."
                                     " Batch pull requests are off.", "token_malformed")
    return TokenState("ok", token=token)


def token_status(settings) -> Dict[str, Any]:
    """Whether batch pull requests are on, for the status page (never the token)."""
    state = read_token(settings)
    return {"enabled": state.enabled, "problem": state.problem}


# ---------------------------------------------------------------- transport

class _ApiOnlyRedirect(urllib.request.HTTPRedirectHandler):
    """Follow a redirect only to https://api.github.com; anything else comes back as the 3xx."""

    max_redirections = 3

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parts = urlsplit(newurl)
        if (parts.scheme != "https" or (parts.hostname or "").lower() != API_HOST
                or parts.port not in (None, 443) or parts.username or parts.password):
            log.warning("github redirect refused (not to %s)", API_HOST)
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_ApiOnlyRedirect)


def _read_capped(resp) -> bytes:
    parts, total = [], 0
    while True:
        data = resp.read(1 << 20)
        if not data:
            break
        parts.append(data)
        total += len(data)
        if total > MAX_BODY_BYTES:
            raise GitHubError(getattr(resp, "status", 0) or 0, "read", "response_too_large")
    return b"".join(parts)


def default_transport(method: str, url: str, headers: Dict[str, str], body: Optional[bytes],
                      timeout: float) -> Tuple[int, Mapping[str, str], bytes]:
    _check_url(url)
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with _opener.open(request, timeout=timeout) as resp:
            return resp.status, dict(resp.headers.items()), _read_capped(resp)
    except urllib.error.HTTPError as exc:
        try:
            payload = exc.read(65536) or b""
        except (OSError, http.client.HTTPException):
            payload = b""
        return exc.code, dict(exc.headers.items()) if exc.headers else {}, payload


def _check_url(url: str) -> None:
    parts = urlsplit(url)
    if parts.scheme != "https" or (parts.hostname or "").lower() != API_HOST or parts.port not in (None, 443):
        raise NotAllowed("GitHub calls go to https://api.github.com only")


# ---------------------------------------------------------------- the client

def _allowed(repo: str) -> List[Tuple[str, "re.Pattern[str]"]]:
    r = re.escape(f"/repos/{repo}")
    branch = re.escape(BATCH_BRANCH)
    rules = [
        ("GET", rf"{r}/git/ref/heads/(?:{re.escape(BASE_BRANCH)}|{branch})"),
        ("GET", rf"{r}/git/commits/{_SHA}"),
        ("GET", rf"{r}/git/trees/{_SHA}"),
        ("GET", rf"{r}/git/blobs/{_SHA}"),
        ("GET", rf"{r}/pulls\?state=open&head=[^&]+&base={re.escape(BASE_BRANCH)}&per_page=100"),
        ("POST", rf"{r}/git/blobs"),
        ("POST", rf"{r}/git/trees"),
        ("POST", rf"{r}/git/commits"),
        ("POST", rf"{r}/git/refs"),
        ("PATCH", rf"{r}/git/refs/heads/{branch}"),
        ("POST", rf"{r}/pulls"),
        ("PATCH", rf"{r}/pulls/\d{{1,9}}"),
    ]
    return [(method, re.compile(pattern)) for method, pattern in rules]


class GitHubClient:
    """A small GitHub REST client limited to the calls a batch pull request needs."""

    def __init__(self, token: str, settings, transport: Optional[Transport] = None):
        repo = str(settings.github_repo)
        if not _REPO.fullmatch(repo):
            raise NotAllowed("github_repo must look like owner/name")
        self.repo = repo
        self.owner = repo.split("/", 1)[0]
        self._token = token
        self._user_agent = settings.user_agent
        self._timeout = float(settings.github_timeout_s)
        self._send = transport or default_transport
        self._rules = _allowed(repo)

    def __repr__(self) -> str:
        return f"GitHubClient(repo={self.repo!r})"

    # -------------------------------------------------------- one call
    def _check(self, method: str, path: str, payload: Optional[dict]) -> None:
        if "merge" in path.lower() or "review" in path.lower():
            raise NotAllowed("merging, reviewing, and approving are never done by the engine")
        if not any(method == m and rule.fullmatch(path) for m, rule in self._rules):
            raise NotAllowed(f"{method} is not allowed on this path")
        if payload is None:
            return
        if path.endswith("/git/refs") and payload.get("ref") != f"refs/heads/{BATCH_BRANCH}":
            raise NotAllowed("only the batch branch may be created")
        if path.endswith("/git/trees"):
            entries = payload.get("tree") or []
            if len(entries) != 1 or entries[0].get("path") != FILE_PATH or entries[0].get("mode") != "100644":
                raise NotAllowed(f"a batch commit changes {FILE_PATH} only")
        if path.endswith("/pulls"):
            if payload.get("base") != BASE_BRANCH or payload.get("head") != BATCH_BRANCH or payload.get("draft"):
                raise NotAllowed("a batch pull request goes from the batch branch to main, ready for review")
        if re.search(r"/pulls/\d+$", path) and set(payload) - {"title", "body"}:
            raise NotAllowed("an open batch pull request is only retitled and redescribed")

    def call(self, method: str, path: str, step: str, payload: Optional[dict] = None,
             ok: Iterable[int] = (200, 201), missing_ok: bool = False) -> Any:
        self._check(method, path, payload)
        url = API_ROOT + path
        _check_url(url)
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": "Bearer " + self._token,
            "User-Agent": self._user_agent,
            "X-GitHub-Api-Version": API_VERSION,
        }
        body = None
        if payload is not None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json"
        try:
            status, _headers, raw = self._send(method, url, headers, body, self._timeout)
        except (OSError, http.client.HTTPException) as exc:
            raise GitHubError(0, step, f"network_{type(exc).__name__}") from None
        if missing_ok and status == 404:
            return None
        if status not in tuple(ok):
            raise GitHubError(status, step)
        if not raw:
            return {}
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            raise GitHubError(status, step, "invalid_json") from None

    # -------------------------------------------------------- reads
    def branch_sha(self, branch: str) -> Optional[str]:
        data = self.call("GET", f"/repos/{self.repo}/git/ref/heads/{branch}", f"read {branch}", missing_ok=True)
        if data is None:
            return None
        sha = ((data or {}).get("object") or {}).get("sha")
        if not isinstance(sha, str) or not re.fullmatch(_SHA, sha):
            raise GitHubError(200, f"read {branch}", "no_sha")
        return sha

    def commit_tree(self, commit_sha: str) -> str:
        data = self.call("GET", f"/repos/{self.repo}/git/commits/{commit_sha}", "read commit")
        sha = ((data or {}).get("tree") or {}).get("sha")
        if not isinstance(sha, str) or not re.fullmatch(_SHA, sha):
            raise GitHubError(200, "read commit", "no_tree")
        return sha

    def file_in_tree(self, tree_sha: str, path: str = FILE_PATH) -> Optional[bytes]:
        """The file's bytes in the tree, or None when it is not there. Walks one folder at a time."""
        parts = path.split("/")
        current = tree_sha
        for i, name in enumerate(parts):
            data = self.call("GET", f"/repos/{self.repo}/git/trees/{current}", "read tree")
            wanted = "blob" if i == len(parts) - 1 else "tree"
            entry = next((e for e in (data or {}).get("tree") or []
                          if e.get("path") == name and e.get("type") == wanted), None)
            if entry is None or not re.fullmatch(_SHA, str(entry.get("sha") or "")):
                return None
            current = entry["sha"]
        blob = self.call("GET", f"/repos/{self.repo}/git/blobs/{current}", "read file")
        if (blob or {}).get("encoding") != "base64":
            raise GitHubError(200, "read file", "unexpected_encoding")
        try:
            return base64.b64decode(blob.get("content") or "", validate=False)
        except ValueError:
            raise GitHubError(200, "read file", "invalid_base64") from None

    def open_batch_prs(self) -> List[dict]:
        head = quote(f"{self.owner}:{BATCH_BRANCH}", safe=":/")
        data = self.call("GET", f"/repos/{self.repo}/pulls?state=open&head={head}&base={BASE_BRANCH}&per_page=100",
                         "list pull requests")
        pulls = []
        for pr in data if isinstance(data, list) else []:
            head_info = pr.get("head") or {}
            base_info = pr.get("base") or {}
            repo_name = ((head_info.get("repo") or {}).get("full_name") or "").lower()
            if (head_info.get("ref") == BATCH_BRANCH and base_info.get("ref") == BASE_BRANCH
                    and repo_name == self.repo.lower() and pr.get("state", "open") == "open"
                    and isinstance(pr.get("number"), int)):
                pulls.append(pr)
        return sorted(pulls, key=lambda p: p["number"])

    # -------------------------------------------------------- writes
    def commit_file(self, main_sha: str, main_tree: str, content: bytes, message: str) -> str:
        """One commit on top of ``main`` that replaces FILE_PATH only. Returns its sha."""
        blob = self.call("POST", f"/repos/{self.repo}/git/blobs", "write file",
                         {"content": base64.b64encode(content).decode("ascii"), "encoding": "base64"})
        tree = self.call("POST", f"/repos/{self.repo}/git/trees", "write tree",
                         {"base_tree": main_tree,
                          "tree": [{"path": FILE_PATH, "mode": "100644", "type": "blob", "sha": blob.get("sha")}]})
        commit = self.call("POST", f"/repos/{self.repo}/git/commits", "write commit",
                           {"message": message, "tree": tree.get("sha"), "parents": [main_sha],
                            "author": dict(COMMIT_AUTHOR), "committer": dict(COMMIT_AUTHOR)})
        sha = commit.get("sha")
        if not isinstance(sha, str) or not re.fullmatch(_SHA, sha):
            raise GitHubError(201, "write commit", "no_sha")
        return sha

    def point_batch_branch(self, commit_sha: str, exists: bool) -> None:
        """Create the batch branch at the commit, or move it there (force: the engine owns this branch)."""
        if exists:
            self.call("PATCH", f"/repos/{self.repo}/git/refs/heads/{BATCH_BRANCH}", "move batch branch",
                      {"sha": commit_sha, "force": True})
        else:
            self.call("POST", f"/repos/{self.repo}/git/refs", "create batch branch",
                      {"ref": f"refs/heads/{BATCH_BRANCH}", "sha": commit_sha})

    def open_pr(self, title: str, body: str) -> dict:
        return self.call("POST", f"/repos/{self.repo}/pulls", "open pull request",
                         {"title": title, "head": BATCH_BRANCH, "base": BASE_BRANCH, "body": body,
                          "draft": False, "maintainer_can_modify": True})

    def update_pr(self, number: int, title: str, body: str) -> dict:
        return self.call("PATCH", f"/repos/{self.repo}/pulls/{int(number)}", "update pull request",
                         {"title": title, "body": body})


# ---------------------------------------------------------------- comparing exports

def export_bytes(data: dict) -> bytes:
    """The file exactly as ``publish.write_export`` writes it."""
    return (json.dumps(data, indent=2, sort_keys=False, ensure_ascii=False) + "\n").encode("utf-8")


def _without_stamp(data: Optional[dict]) -> bytes:
    rest = {k: v for k, v in (data or {}).items() if k not in ("generatedAt", "batchId")}
    return export_bytes(rest)


def same_batch(a: Optional[dict], b: Optional[dict]) -> bool:
    """Byte-identical once ``generatedAt`` and ``batchId`` are set aside."""
    if a is None or b is None:
        return False
    return _without_stamp(a) == _without_stamp(b)


def parse_export(raw: Optional[bytes]) -> Optional[dict]:
    if raw is None:
        return None
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def _businesses(data: Optional[dict]) -> List[dict]:
    items = (data or {}).get("businesses")
    return [b for b in items if isinstance(b, dict) and b.get("id")] if isinstance(items, list) else []


def published_on_main(old: Optional[dict]) -> int:
    """Businesses currently public from main's file (a sample file publishes none)."""
    if not old or old.get("sample"):
        return 0
    return len(_businesses(old))


def removal_too_large(old: Optional[dict], removed: int) -> bool:
    base = published_on_main(old)
    return base > 0 and removed > base * MAX_REMOVAL_SHARE


def skip_reason(new: Optional[dict]) -> Optional[str]:
    """Why an export must never be proposed, or None."""
    if new is None:
        return "no_export"
    if new.get("schemaVersion") != publish.SCHEMA_VERSION or not isinstance(new.get("businesses"), list):
        return "not_an_export"
    if new.get("sample") is not False:
        return "sample"
    if not _businesses(new):
        return "empty"
    return None


# ---------------------------------------------------------------- the pull request text

def hidden_ids(conn) -> Set[str]:
    """Public ids whose names must never appear in a pull request: held, suppressed, or in review."""
    marks = ",".join("?" * len(HIDDEN_STATES))
    ids = {r[0] for r in conn.execute(
        f"SELECT public_id FROM businesses WHERE public_id IS NOT NULL AND publish_state IN ({marks})",
        HIDDEN_STATES)}
    ids |= {r[0] for r in conn.execute("SELECT value FROM suppressions WHERE kind='public_id'")}
    return ids


def ready_ids(conn) -> Set[str]:
    return {r[0] for r in conn.execute(
        "SELECT public_id FROM businesses WHERE public_id IS NOT NULL AND publish_state='ready'")}


def known_ids(conn) -> Set[str]:
    return {r[0] for r in conn.execute("SELECT public_id FROM businesses WHERE public_id IS NOT NULL")}


def _name_line(business: dict) -> Optional[str]:
    name = business.get("name")
    if not isinstance(name, str) or not name.strip():
        return None
    name = re.sub(r"\s+", " ", name).strip().replace("`", "'")[:120]
    category = CATEGORY_NAMES.get(business.get("category"), "Other Services")
    return f"- `{name}` ({category})"


def _when(value: Any) -> str:
    dt = publish.to_local(value)
    if dt is None:
        return "unknown time"
    hour = dt.hour % 12 or 12
    return f"{dt:%b} {dt.day}, {dt.year}, {hour}:{dt:%M} {'AM' if dt.hour < 12 else 'PM'} {dt.tzname()}"


@dataclass
class Batch:
    """Everything the pull request says, worked out without any network call."""
    new: dict
    old: Optional[dict]
    diff: Dict[str, List[str]]
    added_lines: List[str]
    removed_lines: List[str]
    removed_unnamed: int
    added_unnamed: int

    @property
    def counts(self) -> Dict[str, int]:
        c = self.new.get("counts") or {}
        return {
            "published": len(_businesses(self.new)),
            "added": len(self.diff["added"]),
            "removed": len(self.diff["removed"]),
            "changed": len(self.diff["changed"]),
            "held_for_privacy": int(c.get("heldForPrivacy") or 0),
            "waiting_for_review": int(c.get("needsReview") or 0),
        }


def plan_batch(conn, new: dict, old: Optional[dict]) -> Batch:
    """The diff and the names that may be shown (see the module note)."""
    diff = publish.diff_exports(old if (old and not old.get("sample")) else None, new)
    hidden = hidden_ids(conn)
    ready = ready_ids(conn)
    known = known_ids(conn)
    new_by_id = {b["id"]: b for b in _businesses(new)}
    old_by_id = {b["id"]: b for b in _businesses(old)} if old and not old.get("sample") else {}

    def by_name(ids, rows):
        return sorted(ids, key=lambda i: (str(rows[i].get("name") or "").casefold(), i))

    added_lines, added_unnamed = [], 0
    for ident in by_name(diff["added"], new_by_id):
        line = _name_line(new_by_id[ident]) if ident in ready and ident not in hidden else None
        if line is None:
            added_unnamed += 1
        elif len(added_lines) < MAX_NAMES:
            added_lines.append(line)
    removed_lines, removed_unnamed = [], 0
    for ident in by_name(diff["removed"], old_by_id):
        # Already public on main, but a business held, suppressed (a removal request), or in
        # review, or one the archive no longer knows, is never named.
        line = _name_line(old_by_id[ident]) if ident in known and ident not in hidden else None
        if line is None:
            removed_unnamed += 1
        elif len(removed_lines) < MAX_NAMES:
            removed_lines.append(line)
    return Batch(new, old, diff, added_lines, removed_lines, removed_unnamed, added_unnamed)


def pr_title(batch: Batch) -> str:
    c = batch.counts
    day = publish.local_date(batch.new.get("generatedAt")) or "undated"
    return (f"Longview directory batch {day}: {c['added']} added, {c['removed']} removed,"
            f" {c['changed']} changed")


def pr_body(batch: Batch, settings) -> str:
    c = batch.counts
    new = batch.new
    day = publish.local_date(new.get("generatedAt")) or "undated"
    lines = [
        f"## Longview directory batch, {day}",
        "",
        f"Batch `{str(new.get('batchId') or '-')[:32]}`, written {_when(new.get('generatedAt'))}"
        " (Central time).",
        "",
        "**Merging this pull request publishes these profiles on theleadflowpro.com.**",
    ]
    if new.get("indexable"):
        lines.append("Indexing is ON in this batch: profiles with a fact from the business's own website"
                     " can show up in Google.")
    else:
        lines.append("Profiles stay noindex (hidden from Google) until indexing is turned on.")
    lines += [
        "",
        "Vercel adds a link to the preview to this pull request automatically. Open it before you merge.",
        "",
        "### Counts",
        "",
        f"- Published after merge: **{c['published']:,}**",
        f"- Added: {c['added']:,}",
        f"- Removed: {c['removed']:,}",
        f"- Changed: {c['changed']:,}",
        f"- Held for privacy (not published): {c['held_for_privacy']:,}",
        f"- Waiting for review (not published): {c['waiting_for_review']:,}",
    ]
    if removal_too_large(batch.old, c["removed"]):
        lines += ["", f"**Large removal:** this batch removes more than {int(MAX_REMOVAL_SHARE * 100)}% of the"
                      " businesses published now. A person on the droplet allowed it to be proposed."
                      " Check the removed list carefully."]
    if batch.old is None:
        lines += ["", "There was no directory file on main yet, so every business is new."]
    elif batch.old.get("sample"):
        lines += ["", "This replaces the sample (made-up) file on main."]

    lines += ["", f"### Added ({c['added']:,})", ""]
    if batch.added_lines:
        lines += batch.added_lines
        more = c["added"] - len(batch.added_lines) - batch.added_unnamed
        if more > 0:
            lines.append(f"- ...and {more:,} more (see the preview)")
    else:
        lines.append("None.")
    if batch.added_unnamed:
        lines.append(f"{batch.added_unnamed:,} added not named here.")

    lines += ["", f"### Removed ({c['removed']:,})", ""]
    if batch.removed_lines:
        lines += batch.removed_lines
        more = c["removed"] - len(batch.removed_lines) - batch.removed_unnamed
        if more > 0:
            lines.append(f"- ...and {more:,} more")
    elif not batch.removed_unnamed:
        lines.append("None.")
    if batch.removed_unnamed:
        lines.append(f"{batch.removed_unnamed:,} removed for privacy, a removal request, or review"
                     " (names not listed).")

    lines += [
        "",
        "### Spot-check before you merge",
        "",
        "- [ ] Open the Vercel preview, then /longview/businesses. The list loads and there is no sample banner.",
        "- [ ] Open three new profiles. Each name is a business, not a person's name.",
        "- [ ] A street address shows only for a storefront; other profiles say \"Longview, TX\".",
        "- [ ] Phone, email, and hours match the business's own website (follow the source link).",
        "- [ ] Each profile lists its sources with a checked date.",
        "- [ ] Nothing on the removed list surprises you.",
        "",
        "### About this pull request",
        "",
        f"The Longview archive engine opened this. It changes only `{FILE_PATH}`. It never merges:"
        " merging is your approval. If a newer batch is ready before you merge, it updates this same pull"
        " request (at most once a day). To skip a batch, close this without merging. To turn these pull"
        f" requests off, delete `{settings.github_token_file}` on the droplet.",
    ]
    return "\n".join(lines) + "\n"


def commit_message(batch: Batch) -> str:
    c = batch.counts
    return (f"Longview directory batch {str(batch.new.get('batchId') or '')[:32]}\n\n"
            f"{c['published']} published: {c['added']} added, {c['removed']} removed, {c['changed']} changed.\n"
            f"Written by the Longview archive engine; changes {FILE_PATH} only.\n")


# ---------------------------------------------------------------- the run

def _now(now: Any) -> datetime:
    return publish.resolve_now(now)


def is_due(conn, settings, now: Any = None) -> bool:
    now_dt = _now(now)
    hold = publish.as_datetime(db.get_meta(conn, META_HOLD))
    if hold is not None and now_dt < hold:
        return False
    last = publish.as_datetime(db.get_meta(conn, META_LAST))
    if last is None:
        return True
    elapsed = (now_dt - last).total_seconds()
    return elapsed >= float(settings.publish_pr_every_s) or elapsed < -60


def _record(conn, now_s: str, status: str, counts: Dict[str, Any], error: Optional[str] = None) -> None:
    run_id = db.start_run(conn, RUN_KIND, now_s)
    db.finish_run(conn, run_id, status, counts, error, now_s)


def _problem(conn, now_dt: datetime, code: str, message: str, counts: Dict[str, Any]) -> bool:
    """Record a refusal as an error run, once per code per day. Returns whether a row was written."""
    now_s = db.now_iso(now_dt)
    last_code = db.get_meta(conn, META_PROBLEM)
    last_at = publish.as_datetime(db.get_meta(conn, META_PROBLEM_AT))
    if last_code == code and last_at is not None and 0 <= (now_dt - last_at).total_seconds() < PROBLEM_REPEAT_S:
        return False
    _record(conn, now_s, "error", counts, message)
    db.set_meta(conn, META_PROBLEM, code)
    db.set_meta(conn, META_PROBLEM_AT, now_s)
    log.warning("publish_pr: %s", code)
    return True


def _clear_problem(conn) -> None:
    conn.execute("DELETE FROM meta WHERE key IN (?, ?)", (META_PROBLEM, META_PROBLEM_AT))


def load_export(settings, path: Optional[Path] = None) -> Optional[dict]:
    path = Path(path) if path else settings.publish_export_path
    try:
        return parse_export(path.read_bytes())
    except OSError:
        return None


def main_copy_path(settings) -> Path:
    """Where the engine keeps its last copy of main's directory file (for dry runs)."""
    return settings.publish_export_path.parent / "main-directory.json"


class _Lock:
    """One batch pull request run at a time (the service and the command line)."""

    def __init__(self, settings):
        self.path = settings.db_path.parent / LOCK_NAME
        self.fd: Optional[int] = None

    def __enter__(self) -> bool:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(str(self.path), os.O_RDONLY | os.O_CREAT, 0o600)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            os.close(fd)
            return False
        self.fd = fd
        return True

    def __exit__(self, *exc) -> bool:
        if self.fd is not None:
            try:
                fcntl.flock(self.fd, fcntl.LOCK_UN)
            finally:
                os.close(self.fd)
            self.fd = None
        return False


def run_publish_pr(conn, settings, now: Any = None, transport: Optional[Transport] = None,
                   allow_large_removal: bool = False) -> Dict[str, Any]:
    """Open or update the batch pull request when it is on, due, and the export changed.

    Returns ``{"status": ...}`` with counts. Status is one of ``off``,
    ``refused``, ``not_due``, ``busy``, ``skipped`` (with ``reason``),
    ``held``, ``error``, ``opened``, ``updated``. Every outcome after the
    token and due checks is recorded as a ``publish_pr`` run.
    ``allow_large_removal`` is for a person at the command line who has
    checked a held large removal; the service never sets it.
    """
    now_dt = _now(now)
    now_s = db.now_iso(now_dt)
    token = read_token(settings)
    if token.status == "off":
        _clear_problem(conn)
        return {"status": "off"}
    if not token.enabled:
        _problem(conn, now_dt, token.code or "token", token.problem or "GitHub token refused", {})
        return {"status": "refused", "problem": token.problem}
    if db.get_meta(conn, META_PROBLEM, "").startswith("token_"):
        _clear_problem(conn)
    if not is_due(conn, settings, now_dt):
        return {"status": "not_due"}
    with _Lock(settings) as got:
        if not got:
            return {"status": "busy"}
        return _run_locked(conn, settings, now_dt, now_s, token.token, transport, allow_large_removal)


def _run_locked(conn, settings, now_dt: datetime, now_s: str, token: str,
                transport: Optional[Transport], allow_large_removal: bool) -> Dict[str, Any]:
    db.set_meta(conn, META_CHECKED, now_s)
    new = load_export(settings)
    reason = skip_reason(new)
    if reason:
        _record(conn, now_s, "skipped", {"reason": reason})
        log.info("publish_pr: skipped (%s)", reason)
        return {"status": "skipped", "reason": reason}

    client = GitHubClient(token, settings, transport)
    run_id = db.start_run(conn, RUN_KIND, now_s)
    try:
        main_sha = client.branch_sha(BASE_BRANCH)
        if main_sha is None:
            raise GitHubError(404, f"read {BASE_BRANCH}", "no_main_branch")
        main_tree = client.commit_tree(main_sha)
        raw_old = client.file_in_tree(main_tree)
        old = parse_export(raw_old)
        if raw_old is not None:
            _save_main_copy(settings, raw_old)
        if raw_old is not None and old is None:
            raise GitHubError(200, "read file", "main_file_not_json")
        if same_batch(old, new):
            db.finish_run(conn, run_id, "skipped", {"reason": "same_as_main"}, now=now_s)
            log.info("publish_pr: skipped (same as main)")
            return {"status": "skipped", "reason": "same_as_main"}

        batch = plan_batch(conn, new, old)
        counts: Dict[str, Any] = dict(batch.counts)
        if removal_too_large(old, counts["removed"]) and not allow_large_removal:
            base = published_on_main(old)
            message = (f"Large removal held for a person: this batch would remove {counts['removed']:,} of the"
                       f" {base:,} businesses published now (more than {int(MAX_REMOVAL_SHARE * 100)}%)."
                       " No pull request was opened. Check the archive; if the removals are right, run"
                       " publish-pr --allow-large-removal on the droplet.")
            last_at = publish.as_datetime(db.get_meta(conn, META_PROBLEM_AT))
            repeat = (db.get_meta(conn, META_PROBLEM) == "large_removal" and last_at is not None
                      and 0 <= (now_dt - last_at).total_seconds() < PROBLEM_REPEAT_S)
            if repeat:  # already on the status page today: not another error row every 45 minutes
                db.finish_run(conn, run_id, "skipped", {"reason": "large_removal_held", **counts}, now=now_s)
            else:
                db.finish_run(conn, run_id, "error", counts, message, now_s)
                db.set_meta(conn, META_PROBLEM, "large_removal")
                db.set_meta(conn, META_PROBLEM_AT, now_s)
            log.warning("publish_pr: large removal held (%d of %d)", counts["removed"], base)
            return {"status": "held", "problem": message, **counts}

        pulls = client.open_batch_prs()
        branch_sha = client.branch_sha(BATCH_BRANCH)
        if pulls and branch_sha is not None:
            on_branch = parse_export(client.file_in_tree(client.commit_tree(branch_sha)))
            if same_batch(on_branch, new):
                db.finish_run(conn, run_id, "skipped", {"reason": "already_proposed", **counts}, now=now_s)
                log.info("publish_pr: skipped (the open pull request already has this batch)")
                return {"status": "skipped", "reason": "already_proposed", **counts}

        counts["large_removal_allowed"] = int(bool(allow_large_removal and removal_too_large(old, counts["removed"])))
        title, body = pr_title(batch), pr_body(batch, settings)
        commit = client.commit_file(main_sha, main_tree, export_bytes(new), commit_message(batch))
        client.point_batch_branch(commit, exists=branch_sha is not None)
        if pulls:
            action = "updated"
            client.update_pr(pulls[0]["number"], title, body)
        else:
            try:
                client.open_pr(title, body)
                action = "opened"
            except GitHubError as exc:
                if exc.status != 422:
                    raise
                # Opened meanwhile (another run or a person): update it instead of a second one.
                pulls = client.open_batch_prs()
                if not pulls:
                    raise
                client.update_pr(pulls[0]["number"], title, body)
                action = "updated"
        counts["action"] = action
        db.finish_run(conn, run_id, "ok", counts, now=now_s)
        db.set_meta(conn, META_LAST, now_s)
        db.set_meta(conn, META_LAST_ACTION, action)
        db.set_meta(conn, META_LAST_COUNTS, db.dumps({k: v for k, v in counts.items() if isinstance(v, int)}))
        conn.execute("DELETE FROM meta WHERE key=?", (META_HOLD,))
        _clear_problem(conn)
        log.info("publish_pr: %s the batch pull request (%s)", action,
                 " ".join(f"{k}={v}" for k, v in counts.items() if isinstance(v, int)))
        return {"status": action, **counts}
    except GitHubError as exc:
        message = describe_error(exc)
        db.finish_run(conn, run_id, "error", {}, message, now_s)
        db.set_meta(conn, META_HOLD, db.now_iso(now_dt + timedelta(seconds=RETRY_AFTER_ERROR_S)))
        log.warning("publish_pr failed: %s %s (%s)", API_HOST, exc.status, exc.step)
        return {"status": "error", "error": message}
    except BaseException as exc:  # an interruption or a bug: recorded by class only
        db.finish_run(conn, run_id, "error", {}, type(exc).__name__, now_s)
        db.set_meta(conn, META_HOLD, db.now_iso(now_dt + timedelta(seconds=RETRY_AFTER_ERROR_S)))
        raise


def _save_main_copy(settings, raw: bytes) -> None:
    try:
        publish.atomic_write(main_copy_path(settings), raw, 0o600)
    except OSError as exc:
        log.warning("publish_pr: main copy not saved: %s", type(exc).__name__)


def dry_run(conn, settings, base_path: Optional[Path] = None) -> Dict[str, Any]:
    """What the next batch pull request would say, from local files only (no network).

    The base is ``base_path``, else the engine's last copy of main's file, else nothing.
    """
    new = load_export(settings)
    token = read_token(settings)
    result: Dict[str, Any] = {"enabled": token.enabled, "token_problem": token.problem,
                              "export": str(settings.publish_export_path)}
    reason = skip_reason(new)
    base = Path(base_path) if base_path else main_copy_path(settings)
    old = load_export(settings, base) if base.exists() else None
    result["base"] = str(base) if base.exists() else None
    if reason:
        result.update(outcome="skip", reason=reason)
        return result
    batch = plan_batch(conn, new, old)
    result["counts"] = batch.counts
    result["title"] = pr_title(batch)
    result["body"] = pr_body(batch, settings)
    if same_batch(old, new):
        result.update(outcome="skip", reason="same_as_main")
    elif removal_too_large(old, batch.counts["removed"]):
        result.update(outcome="held", reason="large_removal")
    else:
        result.update(outcome="propose", reason=None)
    return result


def status_info(conn, settings) -> Dict[str, Any]:
    """For the status page: on or off, why off, and the last pull request (time and counts only)."""
    state = token_status(settings)
    counts = {}
    raw = db.get_meta(conn, META_LAST_COUNTS)
    if raw:
        try:
            loaded = json.loads(raw)
            counts = {k: v for k, v in loaded.items() if isinstance(v, int) and not isinstance(v, bool)}
        except ValueError:
            counts = {}
    problem_code = db.get_meta(conn, META_PROBLEM)
    return {
        "enabled": state["enabled"],
        "problem": state["problem"] or ("Large removal held for a person" if problem_code == "large_removal"
                                        else None),
        "lastOpenedAt": db.get_meta(conn, META_LAST),
        "lastAction": db.get_meta(conn, META_LAST_ACTION),
        "lastCounts": counts,
        "lastCheckedAt": db.get_meta(conn, META_CHECKED),
    }
