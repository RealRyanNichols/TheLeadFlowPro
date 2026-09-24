"""Batch pull requests (github_pr.py) against a fake GitHub. Nothing here touches the network.

``FakeGitHub`` is a transport with the same shape as the real one. It keeps
blobs, trees, commits, refs, and pull requests in memory, so the tests can
check what would land on GitHub: one commit on top of main that changes only
content/longview-directory/directory.json, the batch branch, and one ready pull
request. Every business is fictional (``.example`` domains, 555-01xx numbers).
"""

import base64
import contextlib
import dataclasses
import hashlib
import io
import json
import logging
import os
import re
import socket
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path
from unittest import mock
from urllib.parse import parse_qs, urlsplit

from longview_archive import __main__ as cli
from longview_archive import config, db, github_pr, publish, status
from longview_archive.service import bootstrap
from tests.fixtures import builders as b
from tests.test_publish import NOW, PLANTED, build_world
from tests.test_service import ServiceTestBase

TOKEN = "github_pat_" + "Zq7Fictional0Token1For2Tests3Only" * 2
REPO = "RealRyanNichols/TheLeadFlowPro"
EMPTY_MAIN = (b'{\n  "schemaVersion": 1,\n  "generatedAt": null,\n  "batchId": null,\n  "sample": false,\n'
              b'  "indexable": false,\n  "scope": "City of Longview, Texas",\n  "counts": { "published": 0,'
              b' "inArchive": 0, "heldForPrivacy": 0, "needsReview": 0 },\n  "sources": [],\n'
              b'  "categories": [],\n  "businesses": []\n}\n')
HIDDEN_NAMES = ["Quillfeather", "Example Pawn", "Example Vape", "Example Nails", "Example Donuts",
                "Example Coffee Cart", "Example Feed Store", "Example Video Rental"]


def sha_of(kind: str, data) -> str:
    return hashlib.sha1(kind.encode() + json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()


class FakeGitHub:
    """An in-memory GitHub REST API for the calls github_pr makes."""

    def __init__(self, main_file=EMPTY_MAIN, fail=None):
        self.blobs, self.trees, self.commits, self.refs, self.pulls = {}, {}, {}, {}, []
        self.calls = []            # (method, url, headers, payload)
        self.fail = fail           # callable(method, path) -> status or None
        readme = self._blob(b"# The LeadFlow Pro\n")
        inner = []
        if main_file is not None:
            inner.append({"path": "directory.json", "type": "blob", "mode": "100644", "sha": self._blob(main_file)})
        inner.append({"path": "suppressions.json", "type": "blob", "mode": "100644", "sha": self._blob(b"{}\n")})
        folder = self._tree(inner)
        content = self._tree([{"path": "longview-directory", "type": "tree", "mode": "040000", "sha": folder}])
        root = self._tree([
            {"path": "README.md", "type": "blob", "mode": "100644", "sha": readme},
            {"path": "content", "type": "tree", "mode": "040000", "sha": content},
        ])
        self.refs["main"] = self._commit(root, [], "initial")
        self.main_at_start = self.refs["main"]

    # ---------------------------------------------------- storage
    def _blob(self, data: bytes) -> str:
        sha = hashlib.sha1(b"blob" + data).hexdigest()
        self.blobs[sha] = data
        return sha

    def _tree(self, entries) -> str:
        entries = sorted(entries, key=lambda e: e["path"])
        sha = sha_of("tree", entries)
        self.trees[sha] = entries
        return sha

    def _commit(self, tree, parents, message, author=None) -> str:
        data = {"tree": tree, "parents": list(parents), "message": message, "author": author}
        sha = sha_of("commit", [data, len(self.commits)])
        self.commits[sha] = data
        return sha

    def _put_path(self, tree_sha, parts, blob_sha) -> str:
        entries = [dict(e) for e in self.trees.get(tree_sha, [])] if tree_sha else []
        name = parts[0]
        existing = next((e for e in entries if e["path"] == name), None)
        if len(parts) == 1:
            entries = [e for e in entries if e["path"] != name]
            entries.append({"path": name, "type": "blob", "mode": "100644", "sha": blob_sha})
        else:
            sub = self._put_path(existing["sha"] if existing else None, parts[1:], blob_sha)
            entries = [e for e in entries if e["path"] != name]
            entries.append({"path": name, "type": "tree", "mode": "040000", "sha": sub})
        return self._tree(entries)

    def files(self, commit_sha, tree_sha=None, prefix="") -> dict:
        """path -> bytes for every file in a commit."""
        tree_sha = tree_sha or self.commits[commit_sha]["tree"]
        out = {}
        for e in self.trees[tree_sha]:
            if e["type"] == "tree":
                out.update(self.files(None, e["sha"], prefix + e["path"] + "/"))
            else:
                out[prefix + e["path"]] = self.blobs[e["sha"]]
        return out

    def open_pulls(self):
        return [p for p in self.pulls if p["state"] == "open"]

    # ---------------------------------------------------- the transport
    def __call__(self, method, url, headers, body, timeout):
        payload = json.loads(body.decode("utf-8")) if body else None
        self.calls.append((method, url, dict(headers), payload))
        parts = urlsplit(url)
        assert parts.scheme == "https" and parts.hostname == "api.github.com", url
        path = parts.path
        prefix = f"/repos/{REPO}"
        assert path.startswith(prefix), path
        path = path[len(prefix):]
        if self.fail:
            code = self.fail(method, path)
            if code:
                return code, {}, b'{"message": "nope"}'
        m = re.fullmatch(r"/git/ref/heads/(.+)", path)
        if method == "GET" and m:
            sha = self.refs.get(m.group(1))
            if sha is None:
                return 404, {}, b'{"message": "Not Found"}'
            return self._ok({"ref": f"refs/heads/{m.group(1)}", "object": {"sha": sha, "type": "commit"}})
        m = re.fullmatch(r"/git/commits/(\w+)", path)
        if method == "GET" and m:
            c = self.commits[m.group(1)]
            return self._ok({"sha": m.group(1), "tree": {"sha": c["tree"]}, "parents": [{"sha": p} for p in c["parents"]]})
        m = re.fullmatch(r"/git/trees/(\w+)", path)
        if method == "GET" and m:
            return self._ok({"sha": m.group(1), "tree": self.trees[m.group(1)], "truncated": False})
        m = re.fullmatch(r"/git/blobs/(\w+)", path)
        if method == "GET" and m:
            data = self.blobs[m.group(1)]
            return self._ok({"sha": m.group(1), "encoding": "base64", "size": len(data),
                             "content": base64.encodebytes(data).decode()})
        if method == "GET" and path == "/pulls":
            query = parse_qs(parts.query)
            owner, _, ref = query["head"][0].partition(":")
            assert owner == REPO.split("/")[0]
            return self._ok([p for p in self.open_pulls() if p["head"]["ref"] == ref
                             and p["base"]["ref"] == query["base"][0]])
        if method == "POST" and path == "/git/blobs":
            return self._ok({"sha": self._blob(base64.b64decode(payload["content"]))}, 201)
        if method == "POST" and path == "/git/trees":
            tree = payload["base_tree"]
            for entry in payload["tree"]:
                tree = self._put_path(tree, entry["path"].split("/"), entry["sha"])
            return self._ok({"sha": tree}, 201)
        if method == "POST" and path == "/git/commits":
            sha = self._commit(payload["tree"], payload["parents"], payload["message"], payload["author"])
            return self._ok({"sha": sha}, 201)
        if method == "POST" and path == "/git/refs":
            name = payload["ref"][len("refs/heads/"):]
            if name in self.refs:
                return 422, {}, b'{"message": "Reference already exists"}'
            self.refs[name] = payload["sha"]
            return self._ok({"ref": payload["ref"]}, 201)
        m = re.fullmatch(r"/git/refs/heads/(.+)", path)
        if method == "PATCH" and m:
            self.refs[m.group(1)] = payload["sha"]
            return self._ok({"ref": f"refs/heads/{m.group(1)}"})
        if method == "POST" and path == "/pulls":
            if any(p["head"]["ref"] == payload["head"] for p in self.open_pulls()):
                return 422, {}, b'{"message": "A pull request already exists"}'
            pr = {"number": 100 + len(self.pulls), "state": "open", "title": payload["title"],
                  "body": payload["body"], "draft": payload.get("draft", False),
                  "head": {"ref": payload["head"], "repo": {"full_name": REPO}}, "base": {"ref": payload["base"]}}
            self.pulls.append(pr)
            return self._ok(pr, 201)
        m = re.fullmatch(r"/pulls/(\d+)", path)
        if method == "PATCH" and m:
            pr = next(p for p in self.pulls if p["number"] == int(m.group(1)))
            pr.update({k: payload[k] for k in ("title", "body") if k in payload})
            return self._ok(pr)
        raise AssertionError(f"unexpected call {method} {path}")

    @staticmethod
    def _ok(data, code=200):
        return code, {"Content-Type": "application/json"}, json.dumps(data).encode()

    def writes(self):
        return [c for c in self.calls if c[0] != "GET"]


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.token_file = root / "etc" / "github-token"
        self.settings = config.Settings(data_dir=root / "data", github_token_file=self.token_file)
        self.settings.ensure_dirs()
        self.conn = b.make_db()
        self.addCleanup(self.conn.close)
        self.ids = build_world(self.conn)
        publish.run_publish(self.conn, self.settings, NOW)
        self.export = json.loads(self.settings.publish_export_path.read_text(encoding="utf-8"))
        self.now = NOW
        self.logs = io.StringIO()
        handler = logging.StreamHandler(self.logs)
        handler.setLevel(logging.DEBUG)
        logger = logging.getLogger("longview_archive")
        old_level = logger.level
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        self.addCleanup(logger.removeHandler, handler)
        self.addCleanup(logger.setLevel, old_level)

    def write_token(self, mode=0o640, text=TOKEN + "\n"):
        self.token_file.parent.mkdir(parents=True, exist_ok=True)
        self.token_file.write_text(text)
        os.chmod(self.token_file, mode)

    def write_export(self, data):
        publish.write_export(self.settings.publish_export_path, data)

    def run_pr(self, gh, hours=0, **kw):
        return github_pr.run_publish_pr(self.conn, self.settings, self.now + timedelta(hours=hours),
                                        transport=gh, **kw)

    def runs(self):
        return [dict(r) for r in self.conn.execute("SELECT * FROM runs WHERE kind='publish_pr' ORDER BY id")]

    def main_with(self, businesses, **top):
        data = dict(self.export)
        data.update(generatedAt="2026-09-20T12:00:00Z", batchId="2026-09-20T12:00Z", **top)
        data["businesses"] = businesses
        return github_pr.export_bytes(data)

    def fake_business(self, ident, name, category="retail"):
        template = dict(self.export["businesses"][0])
        template.update(id=ident, slug=ident, name=name, category=category)
        return template


class Disabled(Base):
    def test_off_without_a_token_file(self):
        gh = FakeGitHub()
        result = self.run_pr(gh)
        self.assertEqual(result, {"status": "off"})
        self.assertEqual(gh.calls, [])
        self.assertEqual(self.runs(), [])
        info = status.collect(self.conn, self.settings, NOW)["batchPullRequests"]
        self.assertFalse(info["enabled"])
        self.assertIsNone(info["problem"])
        self.assertIsNone(info["lastOpenedAt"])

    def test_refuses_a_world_readable_token(self):
        self.write_token(mode=0o644)
        gh = FakeGitHub()
        result = self.run_pr(gh)
        self.assertEqual(result["status"], "refused")
        self.assertIn("everyone", result["problem"])
        self.assertEqual(gh.calls, [])
        runs = self.runs()
        self.assertEqual([(r["status"]) for r in runs], ["error"])
        self.assertIn("chmod 0640", runs[0]["error"])
        data = status.collect(self.conn, self.settings, NOW)
        self.assertFalse(data["batchPullRequests"]["enabled"])
        self.assertIn("everyone", data["batchPullRequests"]["problem"])
        self.assertIn("publish_pr", [e["kind"] for e in data["errors"]])
        page = status.render_html(data)
        self.assertIn("Batch pull requests", page)
        self.assertIn("chmod 0640", page)
        # The same refusal again is not another error row every loop.
        self.run_pr(gh, hours=1)
        self.assertEqual(len(self.runs()), 1)
        # Fixed: on, and the token problem is gone.
        os.chmod(self.token_file, 0o640)
        self.assertTrue(github_pr.read_token(self.settings).enabled)
        self.assertEqual(self.run_pr(gh, hours=2)["status"], "opened")
        self.assertIsNone(status.collect(self.conn, self.settings, NOW)["batchPullRequests"]["problem"])

    def test_refuses_other_bad_token_files(self):
        for mode, text, code in ((0o602, TOKEN, "token_world_readable"), (0o640, "", "token_malformed"),
                                 (0o640, "two tokens " + TOKEN, "token_malformed")):
            with self.subTest(mode=oct(mode), text=text[:5]):
                self.write_token(mode=mode, text=text)
                state = github_pr.read_token(self.settings)
                self.assertEqual((state.status, state.code), ("refused", code))
                self.assertNotIn(TOKEN, repr(state))
        self.token_file.unlink()
        self.token_file.symlink_to(self.token_file.parent / "elsewhere")
        self.assertEqual(github_pr.read_token(self.settings).code, "token_not_file")

    def test_settings_keys_and_env(self):
        s = config.load_settings({"LVA_GITHUB_TOKEN_FILE": "/tmp/x/token", "LVA_PUBLISH_PR_EVERY": "90000"})
        self.assertEqual((s.github_token_file, s.publish_pr_every_s), (Path("/tmp/x/token"), 90000))
        d = config.load_settings({})
        self.assertEqual(d.github_token_file, Path("/etc/longview-archive/github-token"))
        self.assertEqual((d.publish_pr_every_s, d.github_repo), (86400, REPO))
        with self.assertRaises(ValueError):
            config.load_settings({"LVA_PUBLISH_PR_EVERY": "60"})


class OpenAndUpdate(Base):
    def setUp(self):
        super().setUp()
        self.write_token()

    def test_creates_branch_commit_and_ready_pr_when_none_is_open(self):
        gh = FakeGitHub()
        result = self.run_pr(gh)
        self.assertEqual(result["status"], "opened")
        self.assertEqual((result["published"], result["added"], result["removed"], result["changed"]), (7, 7, 0, 0))
        # main never moved; the batch branch is one commit on top of it.
        self.assertEqual(gh.refs["main"], gh.main_at_start)
        commit = gh.commits[gh.refs[github_pr.BATCH_BRANCH]]
        self.assertEqual(commit["parents"], [gh.main_at_start])
        self.assertEqual(commit["author"], {"name": "LeadFlow Longview Archive", "email": "hello@theleadflowpro.com"})
        before, after = gh.files(gh.main_at_start), gh.files(gh.refs[github_pr.BATCH_BRANCH])
        changed = {p for p in set(before) | set(after) if before.get(p) != after.get(p)}
        self.assertEqual(changed, {github_pr.FILE_PATH})
        self.assertEqual(after[github_pr.FILE_PATH], self.settings.publish_export_path.read_bytes())
        # One pull request, ready for review, batch branch -> main.
        self.assertEqual(len(gh.pulls), 1)
        pr = gh.pulls[0]
        self.assertEqual((pr["draft"], pr["head"]["ref"], pr["base"]["ref"]), (False, github_pr.BATCH_BRANCH, "main"))
        self.assertIn("Longview directory batch 2026-09-24", pr["title"])
        self.assertIn("Merging this pull request publishes these profiles on theleadflowpro.com", pr["body"])
        self.assertIn("noindex", pr["body"])
        self.assertIn("Vercel adds a link to the preview", pr["body"])
        self.assertIn("- [ ]", pr["body"])
        self.assertIn("`Example Tire & Lube` (Auto)", pr["body"])
        self.assertIn("Batch `2026-09-24T18:00Z`", pr["body"])
        self.assertIn("1:00 PM CDT", pr["body"])
        runs = self.runs()
        self.assertEqual(runs[-1]["status"], "ok")
        self.assertEqual(json.loads(runs[-1]["counts_json"])["added"], 7)
        info = status.collect(self.conn, self.settings, NOW)["batchPullRequests"]
        self.assertTrue(info["enabled"])
        self.assertEqual(info["lastOpenedAt"], "2026-09-24T18:00:07Z")
        self.assertEqual(info["lastCounts"]["added"], 7)
        self.assertIn("Last pull request (opened)", status.render_html(status.collect(self.conn, self.settings, NOW)))

    def test_updates_the_open_pr_instead_of_opening_a_second(self):
        gh = FakeGitHub()
        self.assertEqual(self.run_pr(gh)["status"], "opened")
        first_commit = gh.refs[github_pr.BATCH_BRANCH]
        changed = dict(self.export)
        changed["generatedAt"], changed["batchId"] = "2026-09-25T19:00:00Z", "2026-09-25T19:00Z"
        changed["businesses"] = self.export["businesses"][1:]
        self.write_export(changed)
        result = self.run_pr(gh, hours=25)
        self.assertEqual(result["status"], "updated")
        self.assertEqual(len(gh.pulls), 1)
        self.assertEqual(len(gh.open_pulls()), 1)
        self.assertIn("2026-09-25", gh.pulls[0]["title"])
        self.assertIn("6 added", gh.pulls[0]["title"])
        self.assertNotEqual(gh.refs[github_pr.BATCH_BRANCH], first_commit)
        self.assertEqual(gh.commits[gh.refs[github_pr.BATCH_BRANCH]]["parents"], [gh.main_at_start])
        moves = [c for c in gh.calls if c[0] == "PATCH" and "/git/refs/" in c[1]]
        self.assertEqual(len(moves), 1)
        self.assertTrue(moves[0][3]["force"])
        self.assertTrue(moves[0][1].endswith("/git/refs/heads/longview-directory/batch"))

    def test_a_pr_someone_already_opened_from_the_branch_is_updated(self):
        gh = FakeGitHub()
        gh.refs[github_pr.BATCH_BRANCH] = gh.main_at_start
        gh.pulls.append({"number": 7, "state": "open", "title": "old", "body": "old", "draft": False,
                         "head": {"ref": github_pr.BATCH_BRANCH, "repo": {"full_name": REPO}},
                         "base": {"ref": "main"}})
        self.assertEqual(self.run_pr(gh)["status"], "updated")
        self.assertEqual(len(gh.pulls), 1)
        self.assertNotEqual(gh.pulls[0]["title"], "old")
        self.assertFalse([c for c in gh.calls if c[0] == "POST" and c[1].endswith("/pulls")])

    def test_422_on_open_updates_instead(self):
        gh = FakeGitHub()
        real = gh.__call__

        def racing(method, url, headers, body, timeout):
            if method == "POST" and url.endswith("/pulls"):
                gh.pulls.append({"number": 9, "state": "open", "title": "x", "body": "x", "draft": False,
                                 "head": {"ref": github_pr.BATCH_BRANCH, "repo": {"full_name": REPO}},
                                 "base": {"ref": "main"}})
            return real(method, url, headers, body, timeout)

        self.assertEqual(self.run_pr(racing)["status"], "updated")
        self.assertEqual(len(gh.open_pulls()), 1)

    def test_an_unchanged_batch_is_not_pushed_again_to_the_open_pr(self):
        gh = FakeGitHub()
        self.run_pr(gh)
        again = dict(self.export)
        again["generatedAt"], again["batchId"] = "2026-09-25T20:00:00Z", "2026-09-25T20:00Z"
        self.write_export(again)
        n = len(gh.writes())
        result = self.run_pr(gh, hours=26)
        self.assertEqual((result["status"], result["reason"]), ("skipped", "already_proposed"))
        self.assertEqual(len(gh.writes()), n)

    def test_after_a_merge_the_next_change_opens_a_new_pr(self):
        gh = FakeGitHub()
        self.run_pr(gh)
        gh.refs["main"] = gh.refs[github_pr.BATCH_BRANCH]    # the owner merged
        gh.pulls[0]["state"] = "closed"
        changed = dict(self.export)
        changed["businesses"] = self.export["businesses"][:-1]
        self.write_export(changed)
        result = self.run_pr(gh, hours=25)
        self.assertEqual(result["status"], "opened")
        self.assertEqual((result["removed"], result["added"]), (1, 0))
        self.assertEqual(len(gh.open_pulls()), 1)


class Skips(Base):
    def setUp(self):
        super().setUp()
        self.write_token()

    def test_skips_a_batch_identical_to_main(self):
        gh = FakeGitHub(main_file=self.main_with(self.export["businesses"]))
        result = self.run_pr(gh)
        self.assertEqual((result["status"], result["reason"]), ("skipped", "same_as_main"))
        self.assertEqual(gh.writes(), [])
        self.assertEqual(self.runs()[-1]["status"], "skipped")
        # Not due-limited: a skip does not start the 24-hour clock.
        self.assertTrue(github_pr.is_due(self.conn, self.settings, NOW))

    def test_skips_sample_and_empty_without_calling_github(self):
        for change, reason in (({"sample": True}, "sample"), ({"businesses": []}, "empty")):
            with self.subTest(reason=reason):
                data = dict(self.export)
                data.update(change)
                self.write_export(data)
                gh = FakeGitHub()
                result = self.run_pr(gh)
                self.assertEqual((result["status"], result["reason"]), ("skipped", reason))
                self.assertEqual(gh.calls, [])

    def test_holds_a_removal_of_more_than_a_quarter(self):
        extra = [self.fake_business(f"lv-gone{i:05d}", f"Gone Example Shop {i}") for i in range(4)]
        gh = FakeGitHub(main_file=self.main_with(self.export["businesses"] + extra))
        result = self.run_pr(gh)          # 4 of 11 = 36%
        self.assertEqual(result["status"], "held")
        self.assertEqual(gh.writes(), [])
        runs = self.runs()
        self.assertEqual(runs[-1]["status"], "error")
        self.assertIn("Large removal held for a person", runs[-1]["error"])
        data = status.collect(self.conn, self.settings, NOW)
        self.assertEqual(data["batchPullRequests"]["problem"], "Large removal held for a person")
        self.assertTrue(any("Large removal held for a person" in e["message"] for e in data["errors"]))
        self.assertIn("Large removal held for a person", status.render_html(data))
        # Not another error row every 45 minutes.
        self.run_pr(gh, hours=1)
        self.assertEqual([r["status"] for r in self.runs()], ["error", "skipped"])
        # A person who checked it can let it through; the body warns.
        result = self.run_pr(gh, hours=2, allow_large_removal=True)
        self.assertEqual(result["status"], "opened")
        self.assertIn("Large removal", gh.pulls[0]["body"])
        self.assertIsNone(status.collect(self.conn, self.settings, NOW)["batchPullRequests"]["problem"])

    def test_a_quarter_exactly_is_not_held(self):
        extra = [self.fake_business("lv-gone00001", "Gone Example Shop"), self.fake_business("lv-gone00002", "Gone Two")]
        gh = FakeGitHub(main_file=self.main_with(self.export["businesses"][:6] + extra))  # 2 of 8 = 25%
        self.assertEqual(self.run_pr(gh)["status"], "opened")

    def test_a_sample_file_on_main_is_replaced_without_the_removal_hold(self):
        extra = [self.fake_business(f"lv-samp{i:05d}", f"Sample Shop {i}") for i in range(20)]
        gh = FakeGitHub(main_file=self.main_with(extra, sample=True))
        result = self.run_pr(gh)
        self.assertEqual((result["status"], result["removed"]), ("opened", 0))
        self.assertIn("sample", gh.pulls[0]["body"])

    def test_at_most_one_update_a_day(self):
        gh = FakeGitHub()
        self.assertEqual(self.run_pr(gh)["status"], "opened")
        n = len(gh.calls)
        changed = dict(self.export)
        changed["businesses"] = self.export["businesses"][1:]
        self.write_export(changed)
        for hours in (1, 12, 23.9):
            self.assertEqual(self.run_pr(gh, hours=hours), {"status": "not_due"})
        self.assertEqual(len(gh.calls), n)
        self.assertEqual(self.run_pr(gh, hours=24)["status"], "updated")

    def test_a_github_error_waits_an_hour(self):
        gh = FakeGitHub(fail=lambda method, path: 503)
        result = self.run_pr(gh)
        self.assertEqual(result["status"], "error")
        self.assertIn("503", result["error"])
        self.assertEqual(self.runs()[-1]["status"], "error")
        n = len(gh.calls)
        self.assertEqual(self.run_pr(gh, hours=0.5), {"status": "not_due"})
        self.assertEqual(len(gh.calls), n)
        gh.fail = None
        self.assertEqual(self.run_pr(gh, hours=1.1)["status"], "opened")


class Privacy(Base):
    def setUp(self):
        super().setUp()
        self.write_token()

    def body_for(self, main_businesses, **kw):
        gh = FakeGitHub(main_file=self.main_with(main_businesses))
        result = self.run_pr(gh, allow_large_removal=True, **kw)
        self.assertIn(result["status"], ("opened", "updated"), result)
        return gh.pulls[-1]["title"] + "\n" + gh.pulls[-1]["body"], gh

    def test_body_never_names_held_suppressed_review_or_taxpayer(self):
        by_name = {r["name"]: r["public_id"] for r in self.conn.execute("SELECT name, public_id FROM businesses")}
        # main had every hidden business public (as if published before its removal request or hold),
        # one carrying the planted taxpayer name, and one ready business that fell out of the export.
        old = [self.fake_business(by_name[n], n) for n in HIDDEN_NAMES]
        old.append(self.fake_business(by_name["Quillfeather"], PLANTED))
        old.append(self.fake_business("lv-unknown0001", "Unknown Former Shop"))
        keep = [x for x in self.export["businesses"] if x["name"] != "Example Auto Glass"]
        old += keep + [x for x in self.export["businesses"] if x["name"] == "Example Auto Glass"]
        dropped = dict(self.export)
        dropped["businesses"] = keep
        self.write_export(dropped)
        body, gh = self.body_for(old)
        for name in HIDDEN_NAMES + [PLANTED, "Unknown Former Shop"]:
            self.assertNotIn(name, body)
        self.assertNotIn(PLANTED.lower(), body.lower())
        self.assertIn("`Example Auto Glass` (Auto)", body)          # ready, only fell out: public, named
        self.assertIn("removed for privacy, a removal request, or review (names not listed)", body)
        # Only names and categories: no private or contact fields.
        for needle in ("+1903", "(903)", "@", "exampletire.example", "1200 W Example Ave", "raw_json", "taxpayer"):
            self.assertNotIn(needle, body)

    def test_added_names_exclude_anything_not_ready_in_the_archive(self):
        # An export row whose business is now in review (evaluate ran after the export) is not named.
        self.conn.execute("UPDATE businesses SET publish_state='review' WHERE name='Sample Street Tacos'")
        body, _ = self.body_for([])
        self.assertNotIn("Sample Street Tacos", body)
        self.assertIn("1 added not named here", body)
        self.assertIn("`Brambleworth`", body)

    def test_names_are_capped_at_fifty_and_cannot_break_the_markdown(self):
        many = [self.fake_business(f"lv-many{i:05d}", f"Example `Shop` @someone {i:03d}") for i in range(60)]
        for i, x in enumerate(many):
            b.add_business(self.conn, x["name"], public_id=x["id"], slug=x["id"], publish_state="ready")
        data = dict(self.export)
        data["businesses"] = many
        batch = github_pr.plan_batch(self.conn, data, None)
        body = github_pr.pr_body(batch, self.settings)
        self.assertEqual(body.count("`Example 'Shop' @someone"), 50)
        self.assertIn("...and 10 more", body)
        self.assertNotIn("@someone 0", body.replace("`Example 'Shop' @someone 0", ""))


class TokenAndEndpoints(Base):
    def setUp(self):
        super().setUp()
        self.write_token()

    def everything_stored(self) -> str:
        parts = [json.dumps([dict(r) for r in self.conn.execute(f"SELECT * FROM {t}")])
                 for t in ("runs", "meta", "review_queue")]
        return "\n".join(parts)

    def test_token_never_in_logs_rows_errors_or_status(self):
        outcomes = []
        gh = FakeGitHub()
        outcomes.append(self.run_pr(gh))
        # Every request carries the token only in the Authorization header, only to api.github.com.
        for method, url, headers, payload in gh.calls:
            self.assertTrue(url.startswith("https://api.github.com/repos/"), url)
            self.assertEqual(headers["Authorization"], "Bearer " + TOKEN)
            self.assertEqual(headers["User-Agent"], self.settings.user_agent)
            self.assertNotIn(TOKEN, url + json.dumps(payload))
        # An API error, and a network error whose text carries the token.
        changed = dict(self.export)
        changed["businesses"] = self.export["businesses"][1:]
        self.write_export(changed)
        outcomes.append(self.run_pr(FakeGitHub(fail=lambda m, p: 401), hours=25))

        def leaky(method, url, headers, body, timeout):
            raise ConnectionError("refused while sending " + headers["Authorization"])

        outcomes.append(self.run_pr(leaky, hours=27))
        self.assertEqual([o["status"] for o in outcomes], ["opened", "error", "error"])
        self.assertIn("401", outcomes[1]["error"])
        self.assertIn("network_ConnectionError", outcomes[2]["error"])
        # A bug inside the transport: recorded by class name only, and the raised error has no token.
        with self.assertRaises(RuntimeError) as ctx:
            self.run_pr(mock.Mock(side_effect=RuntimeError("boom " + TOKEN)), hours=29)
        self.assertEqual(self.runs()[-1]["error"], "RuntimeError")
        client = github_pr.GitHubClient(TOKEN, self.settings, FakeGitHub(fail=lambda m, p: 500))
        with self.assertRaises(github_pr.GitHubError) as err:
            client.branch_sha("main")
        stored = self.everything_stored()
        page = status.render_html(status.collect(self.conn, self.settings, NOW))
        for text in (self.logs.getvalue(), stored, page, json.dumps(outcomes), str(err.exception),
                     repr(client), repr(github_pr.read_token(self.settings))):
            self.assertNotIn(TOKEN, text)
            self.assertNotIn(TOKEN[11:30], text)
        self.assertIn(TOKEN, str(ctx.exception))   # our own test transport's message; never stored

    def test_only_the_one_file_and_the_batch_branch_are_written(self):
        gh = FakeGitHub()
        self.run_pr(gh)
        changed = dict(self.export)
        changed["businesses"] = self.export["businesses"][2:]
        self.write_export(changed)
        self.run_pr(gh, hours=25)
        for method, url, headers, payload in gh.writes():
            path = urlsplit(url).path
            if path.endswith("/git/trees"):
                self.assertEqual([e["path"] for e in payload["tree"]], [github_pr.FILE_PATH])
            if path.endswith("/git/refs"):
                self.assertEqual(payload["ref"], "refs/heads/longview-directory/batch")
            if "/git/refs/heads/" in path:
                self.assertTrue(path.endswith("/git/refs/heads/longview-directory/batch"))
        self.assertEqual(gh.refs["main"], gh.main_at_start)
        self.assertEqual(set(gh.refs), {"main", github_pr.BATCH_BRANCH})

    def test_client_refuses_anything_outside_the_allowlist_without_sending(self):
        gh = FakeGitHub()
        client = github_pr.GitHubClient(TOKEN, self.settings, gh)
        base = f"/repos/{REPO}"
        refused = [
            ("PUT", f"{base}/pulls/100/merge", {"merge_method": "squash"}),
            ("POST", f"{base}/merges", {"base": "main", "head": "longview-directory/batch"}),
            ("POST", f"{base}/pulls/100/reviews", {"event": "APPROVE"}),
            ("PUT", f"{base}/pulls/100/update-branch", {}),
            ("PATCH", f"{base}/git/refs/heads/main", {"sha": "0" * 40, "force": True}),
            ("DELETE", f"{base}/git/refs/heads/main", None),
            ("POST", f"{base}/git/refs", {"ref": "refs/heads/main", "sha": "0" * 40}),
            ("POST", f"{base}/git/trees", {"base_tree": "0" * 40, "tree": [
                {"path": "app/page.tsx", "mode": "100644", "type": "blob", "sha": "0" * 40}]}),
            ("POST", f"{base}/git/trees", {"base_tree": "0" * 40, "tree": [
                {"path": github_pr.FILE_PATH, "mode": "100644", "type": "blob", "sha": "0" * 40},
                {"path": "README.md", "mode": "100644", "type": "blob", "sha": "0" * 40}]}),
            ("POST", f"{base}/pulls", {"title": "x", "head": "longview-directory/batch", "base": "main", "draft": True}),
            ("POST", f"{base}/pulls", {"title": "x", "head": "other", "base": "main"}),
            ("PATCH", f"{base}/pulls/100", {"state": "closed"}),
            ("GET", "/repos/someone/else/git/ref/heads/main", None),
            ("PUT", f"{base}/contents/{github_pr.FILE_PATH}", {"content": ""}),
        ]
        for method, path, payload in refused:
            with self.subTest(method=method, path=path):
                with self.assertRaises(github_pr.NotAllowed) as ctx:
                    client.call(method, path, "test", payload)
                self.assertNotIn(TOKEN, str(ctx.exception))
        self.assertEqual(gh.calls, [])

    def test_never_calls_merge_or_review_endpoints_in_a_full_cycle(self):
        gh = FakeGitHub()
        self.run_pr(gh)
        changed = dict(self.export)
        changed["businesses"] = self.export["businesses"][1:]
        self.write_export(changed)
        self.run_pr(gh, hours=25)
        self.assertTrue(gh.calls)
        for method, url, headers, payload in gh.calls:
            self.assertIn(method, ("GET", "POST", "PATCH"))
            self.assertNotRegex(url.lower(), r"merge|review|approve|update-branch|/contents/")
            self.assertNotIn("merge_method", json.dumps(payload or {}))

    def test_only_https_api_github_com(self):
        for url in ("http://api.github.com/x", "https://github.com/x", "https://api.github.com.evil.example/x",
                    "https://api.github.com:8443/x"):
            with self.subTest(url=url), self.assertRaises(github_pr.NotAllowed):
                github_pr.default_transport("GET", url, {}, None, 1.0)
        handler = github_pr._ApiOnlyRedirect()
        req = mock.Mock(full_url="https://api.github.com/repos/x", headers={}, get_method=lambda: "GET")
        for target in ("https://evil.example/x", "http://api.github.com/x", "https://user:pw@api.github.com/x"):
            with self.subTest(target=target):
                self.assertIsNone(handler.redirect_request(req, None, 301, "Moved", {}, target))


class Service(ServiceTestBase):
    def setUp(self):
        super().setUp()
        self.token_file = Path(self.tmp.name) / "etc" / "github-token"
        self.settings = dataclasses.replace(self.settings, github_token_file=self.token_file)

    def seed(self, svc):
        svc.open()
        build_world(svc.conn)

    def test_off_without_the_token_file(self):
        gh = FakeGitHub()
        svc = self.make(transports={"github": gh})
        self.seed(svc)
        report = svc.run_once()
        self.assertEqual(report["publish_pr"], "off")
        self.assertEqual(gh.calls, [])
        self.assertFalse(self.status_json()["batchPullRequests"]["enabled"])

    def test_opens_after_the_export_when_on_and_due(self):
        self.token_file.parent.mkdir(parents=True)
        self.token_file.write_text(TOKEN)
        os.chmod(self.token_file, 0o640)
        gh = FakeGitHub()
        svc = self.make(transports={"github": gh})
        self.seed(svc)
        report = svc.run_once()
        self.assertEqual(report["publish_pr"], "opened")
        self.assertEqual(len(gh.pulls), 1)
        status_page = self.status_json()["batchPullRequests"]
        self.assertTrue(status_page["enabled"])
        self.assertEqual(status_page["lastOpenedAt"], "2026-09-24T07:00:00Z")
        # The next export 45 minutes later: not due, no call.
        n = len(gh.calls)
        self.clock.advance(minutes=46)
        report = svc.run_once()
        self.assertEqual(report["publish_pr"], "not_due")
        self.assertEqual(len(gh.calls), n)

    def test_not_called_under_the_disk_guard_or_pause(self):
        self.token_file.parent.mkdir(parents=True)
        self.token_file.write_text(TOKEN)
        os.chmod(self.token_file, 0o640)
        gh = FakeGitHub()
        self.disk.free = 1
        svc = self.make(transports={"github": gh})
        self.seed(svc)
        report = svc.run_once()
        self.assertIsNotNone(report["published"])
        self.assertIsNone(report["publish_pr"])
        self.assertEqual(gh.calls, [])
        self.disk.free = 50 * config.GIB
        self.settings.pause_file.touch()
        self.clock.advance(hours=1)
        self.assertIsNone(svc.run_once()["publish_pr"])
        self.assertEqual(gh.calls, [])

    def test_a_failure_is_isolated(self):
        self.token_file.parent.mkdir(parents=True)
        self.token_file.write_text(TOKEN)
        os.chmod(self.token_file, 0o640)
        svc = self.make(transports={"github": mock.Mock(side_effect=RuntimeError("bug"))})
        self.seed(svc)
        report = svc.run_once()
        self.assertEqual(report["publish_pr"], "error")
        self.assertTrue(report["status_written"])
        self.assertEqual(self.status_json()["state"], "running")


class DryRun(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.token_file = root / "etc" / "github-token"
        self.env = {"LVA_DATA_DIR": str(root / "data"), "LVA_GITHUB_TOKEN_FILE": str(self.token_file),
                    "LVA_DISK_GUARD_BYTES": "1"}
        with mock.patch.dict(os.environ, self.env):
            self.settings = config.load_settings()
        conn = bootstrap(self.settings)
        build_world(conn)
        publish.run_publish(conn, self.settings, NOW)
        conn.close()

    def cli(self, *args):
        stdout, stderr = io.StringIO(), io.StringIO()
        with mock.patch.dict(os.environ, self.env), contextlib.redirect_stdout(stdout), \
                contextlib.redirect_stderr(stderr):
            code = cli.main(list(args))
        return code, stdout.getvalue(), stderr.getvalue()

    def test_dry_run_prints_title_body_and_counts_without_any_network(self):
        self.token_file.parent.mkdir(parents=True)
        self.token_file.write_text(TOKEN)
        os.chmod(self.token_file, 0o640)
        with mock.patch.object(socket.socket, "connect", side_effect=AssertionError("network")), \
                mock.patch.object(socket, "create_connection", side_effect=AssertionError("network")), \
                mock.patch.object(github_pr, "default_transport", side_effect=AssertionError("network")):
            code, out, err = self.cli("publish-pr", "--dry-run")
        self.assertEqual(code, 0, err)
        self.assertIn("Dry run: nothing was sent anywhere", out)
        self.assertIn("Batch pull requests: on", out)
        self.assertIn("Counts: 7 published: 7 added, 0 removed, 0 changed; 1 held for privacy, 1 waiting for review",
                      out)
        self.assertIn("Title: Longview directory batch 2026-09-24", out)
        self.assertIn("Merging this pull request publishes these profiles", out)
        self.assertNotIn(TOKEN, out + err)
        for name in HIDDEN_NAMES + [PLANTED]:
            self.assertNotIn(name, out)

    def test_dry_run_compares_with_a_given_base_and_real_run_is_off_without_token(self):
        base = Path(self.tmp.name) / "base.json"
        base.write_bytes(self.settings.publish_export_path.read_bytes())
        code, out, _ = self.cli("publish-pr", "--dry-run", "--base", str(base))
        self.assertEqual(code, 0)
        self.assertIn("Batch pull requests: off", out)
        self.assertIn("Skipped: the batch is the same as the file on main.", out)
        with mock.patch.object(github_pr, "default_transport", side_effect=AssertionError("network")):
            code, out, _ = self.cli("publish-pr")
        self.assertEqual(code, 0)
        self.assertIn("Batch pull requests are off", out)


if __name__ == "__main__":
    unittest.main()
