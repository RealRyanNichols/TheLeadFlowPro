"""Deploy checks for the Longview Business Archive droplet install.

Static checks on the systemd unit, the Caddy site file, the three shell
scripts, and the runbook, then the whole install.sh / uninstall.sh flow in a
temporary directory through the test-only hooks (LVA_INSTALL_PREFIX and
LVA_INSTALL_FAKE_SYSTEM=1). Nothing here touches the real system's services,
users, or files, the network, or the droplet.

    cd deploy/longview-archive && python3 -m unittest tests.test_deploy -v

caddy, shellcheck, and systemd-analyze checks run only when those tools are
on PATH.
"""

from __future__ import annotations

import os
import re
import shutil
import socket
import stat
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from longview_archive import config

ROOT = Path(__file__).resolve().parent.parent
UNIT = ROOT / "systemd" / "longview-archive.service"
CADDY = ROOT / "caddy" / "longview-archive.caddy"
ROUTES = ROOT / "caddy" / "website.routes"
ERRORS = ROOT / "caddy" / "website.errors"
PUBLIC_TEMPLATE = ROOT / "caddy" / "public-host.caddy.in"
WEBSITE_CADDY = ROOT.parent / "droplet" / "theleadflowpro.caddy"
DROPLET_INSTALL = ROOT.parent / "droplet" / "install.sh"
INSTALL = ROOT / "install.sh"
UNINSTALL = ROOT / "uninstall.sh"
PREFLIGHT = ROOT / "preflight.sh"
README = ROOT / "README.md"
PACKAGE = ROOT / "longview_archive"
SCRIPTS = (INSTALL, UNINSTALL, PREFLIGHT)
BASH = shutil.which("bash") or "/bin/bash"

STATUS_HOST = "longview.165-227-248-110.sslip.io"
PUBLIC_HOST = "longview.theleadflowpro.com"
DROPLET_IP = "165.227.248.110"
REPO_URL = "https://github.com/RealRyanNichols/TheLeadFlowPro.git"
FORBIDDEN_IN_SCRIPTS = (
    "/etc/pda",
    "/etc/brain",
    "apt ",
    "apt-get",
    "reboot",
    "shutdown",
    "authorized_keys",
    "ssh-keygen",
    "| bash",
    "| sh",
)
# The CLI commands in SPEC.md ("service.py and __main__.py").
SPEC_COMMANDS = {
    "run", "migrate", "sync", "match", "crawl-once", "publish", "status",
    "backup", "suppress", "review", "check", "exports", "approve", "site",
}
STRICT_CSP = ("default-src 'none'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none';"
              " frame-ancestors 'none'")
DIRECTORY_CSP = ("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:;"
                 " connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")


def parse_unit(text: str) -> dict:
    """systemd unit -> {section: {key: [values in order]}}."""
    sections: dict = {}
    current = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith(("#", ";")):
            continue
        if line.startswith("[") and line.endswith("]"):
            current = sections.setdefault(line[1:-1], {})
            continue
        key, sep, value = line.partition("=")
        if not sep or current is None:
            raise AssertionError(f"not a unit line: {raw!r}")
        current.setdefault(key.strip(), []).append(value.strip())
    return sections


def code_lines(path: Path) -> list:
    """Script lines that execute something: no comments, no printed text."""
    out = []
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if re.match(r"(say|step|die|warn|pass|blocker|line|printf|echo)\b", line):
            continue
        out.append(line)
    return out


def mode(path: Path) -> int:
    return stat.S_IMODE(path.stat().st_mode)


class UnitFileTest(unittest.TestCase):
    EXPECTED = {
        "Type": "simple",
        "User": "lvarchive",
        "Group": "lvarchive",
        "WorkingDirectory": "/opt/longview-archive/app",
        "ExecStart": "/opt/longview-archive/venv/bin/python -m longview_archive run",
        "Restart": "always",
        "RestartSec": "30",
        "Nice": "10",
        "IOSchedulingClass": "idle",
        "CPUQuota": "50%",
        "MemoryMax": "700M",
        "TasksMax": "64",
        "NoNewPrivileges": "true",
        "PrivateTmp": "true",
        "ProtectSystem": "strict",
        "ProtectHome": "true",
        "ReadWritePaths": "/var/lib/longview-archive",
        "UMask": "0022",
        "ProtectKernelTunables": "true",
        "ProtectKernelModules": "true",
        "ProtectKernelLogs": "true",
        "ProtectControlGroups": "true",
        "ProtectClock": "true",
        "ProtectHostname": "true",
        "RestrictAddressFamilies": "AF_UNIX AF_INET AF_INET6",
        "RestrictNamespaces": "true",
        "RestrictRealtime": "true",
        "RestrictSUIDSGID": "true",
        "LockPersonality": "true",
        "MemoryDenyWriteExecute": "true",
        "SystemCallArchitectures": "native",
        "CapabilityBoundingSet": "",
        "AmbientCapabilities": "",
        "PrivateDevices": "true",
        "IPAddressAllow": "127.0.0.53",
        "TimeoutStopSec": "60",
        "KillSignal": "SIGTERM",
    }

    @classmethod
    def setUpClass(cls):
        cls.text = UNIT.read_text()
        cls.unit = parse_unit(cls.text)
        cls.service = cls.unit["Service"]

    def test_unit_section(self):
        unit = self.unit["Unit"]
        self.assertTrue(unit["Description"][0])
        self.assertIn("network-online.target", unit["After"][0].split())
        self.assertIn("network-online.target", unit["Wants"][0].split())

    def test_every_required_service_directive(self):
        for key, value in self.EXPECTED.items():
            with self.subTest(key=key):
                # Exactly once, so no later line quietly overrides it.
                self.assertEqual(self.service.get(key), [value])

    def test_environment(self):
        values = " ".join(self.service["Environment"]).split()
        self.assertEqual(
            set(values),
            {
                "PYTHONPATH=/opt/longview-archive/app",
                "PYTHONDONTWRITEBYTECODE=1",
                "PYTHONUNBUFFERED=1",
            },
        )

    def test_network_deny_list(self):
        self.assertEqual(len(self.service["IPAddressDeny"]), 1)
        self.assertEqual(
            set(self.service["IPAddressDeny"][0].split()),
            {
                "localhost",
                "link-local",
                "multicast",
                "10.0.0.0/8",
                "172.16.0.0/12",
                "192.168.0.0/16",
                "100.64.0.0/10",
                "fc00::/7",
                "165.227.248.110/32",
            },
        )

    def test_dns_exception_is_explained(self):
        before_allow = self.text.split("\nIPAddressAllow=")[0]
        comments = [l for l in before_allow.splitlines() if l.startswith("#")]
        why = " ".join(comments[-8:])
        self.assertIn("127.0.0.53", why)
        self.assertIn("systemd-resolved", why)
        self.assertIn("wins over", why)

    def test_port_blind_residual_risk_is_documented(self):
        # IPAddressAllow/Deny match addresses only; the comment must say the
        # DNS exception is open on every port and what covers that gap.
        before_deny = self.text.split("\nIPAddressDeny=")[0]
        comments = " ".join(l for l in before_deny.splitlines() if l.startswith("#"))
        for needle in ("ADDRESS ONLY", "EVERY port", "127.0.0.53:<port>", "165.227.248.110", "80/443"):
            with self.subTest(needle=needle):
                self.assertIn(needle, comments)
        self.assertNotIn("nothing else local", comments)

    def test_install_section(self):
        self.assertEqual(self.unit["Install"]["WantedBy"], ["multi-user.target"])

    def test_no_secrets_or_env_files(self):
        self.assertNotIn("EnvironmentFile", self.service)
        self.assertNotRegex(self.text, r"(?i)(password|secret|token|api_key)=")

    def test_systemd_knows_every_directive(self):
        analyze = shutil.which("systemd-analyze")
        if not analyze:
            self.skipTest("systemd-analyze not installed")
        with tempfile.TemporaryDirectory() as tmp:
            # The venv and user exist only on the droplet; everything else is
            # the unit exactly as shipped.
            text = re.sub(r"(?m)^ExecStart=.*$", "ExecStart=/bin/true", self.text)
            text = re.sub(r"(?m)^(User|Group)=.*$", r"\1=root", text)
            probe = Path(tmp) / "lva-probe.service"
            probe.write_text(text)
            proc = subprocess.run(
                [analyze, "verify", str(probe)], capture_output=True, text=True, timeout=60
            )
        output = proc.stdout + proc.stderr
        self.assertNotIn("Unknown key", output)
        self.assertNotIn("ignoring", output)


class CaddyFileTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = CADDY.read_text()

    def test_host_and_root(self):
        self.assertRegex(self.text, r"(?m)^longview\.165-227-248-110\.sslip\.io \{$")
        self.assertRegex(self.text, r"(?m)^\troot \* /var/lib/longview-archive/www$")
        self.assertIn("file_server", self.text)
        self.assertNotRegex(self.text, r"\bbrowse\b")

    def test_noindex_and_security_headers(self):
        for needle in (
            'X-Robots-Tag "noindex, nofollow, noarchive, nosnippet"',
            "X-Content-Type-Options nosniff",
            "Referrer-Policy no-referrer",
            "X-Frame-Options DENY",
            'Permissions-Policy "camera=(), microphone=(), geolocation=()"',
            'Cache-Control "no-store"',
            "-Server",
        ):
            with self.subTest(header=needle):
                self.assertIn(needle, self.text)
        # The noindex header covers everything, the directory included, while
        # this is a staging host; the file says going public is a separate change.
        snippet = re.search(r"\(longview_archive_headers\) \{(.*?)\n\}", self.text, re.S).group(1)
        self.assertIn("X-Robots-Tag", snippet)
        self.assertRegex(self.text, r"(?m)^\timport longview_archive_headers$")

    @staticmethod
    def directives(policy: str) -> dict:
        return dict((part.split()[0], part.split()[1:]) for part in (p.strip() for p in policy.split(";")) if part)

    def test_csp_allows_nothing_third_party(self):
        policies = re.findall(r'Content-Security-Policy "([^"]+)"', self.text)
        self.assertEqual(sorted(policies), sorted([STRICT_CSP, DIRECTORY_CSP]))
        allowed = {"'none'", "'self'", "data:"}
        for policy in policies:
            directives = self.directives(policy)
            self.assertEqual(directives["default-src"], ["'none'"])
            self.assertEqual(directives["style-src"], ["'self'"])
            self.assertEqual(directives["img-src"], ["'self'", "data:"])
            for name in ("base-uri", "form-action", "frame-ancestors"):
                self.assertEqual(directives[name], ["'none'"])
            for name, sources in directives.items():
                for source in sources:
                    with self.subTest(directive=name, source=source):
                        self.assertIn(source, allowed)
            self.assertNotRegex(policy, r"https?:|//|\*|unsafe")
        strict = self.directives(STRICT_CSP)
        self.assertNotIn("script-src", strict)
        self.assertNotIn("connect-src", strict)
        directory = self.directives(DIRECTORY_CSP)
        self.assertEqual(directory["script-src"], ["'self'"])
        self.assertEqual(directory["connect-src"], ["'self'"])

    def test_script_policy_only_on_the_directory_paths(self):
        self.assertIn("@longview_directory path /longview/businesses /longview/businesses/*", self.text)
        self.assertIn("@longview_not_directory not path /longview/businesses /longview/businesses/*", self.text)
        self.assertRegex(self.text, r"(?m)^\timport longview_archive_csp_directory @longview_directory$")
        self.assertRegex(self.text, r"(?m)^\timport longview_archive_csp_strict @longview_not_directory$")
        errors = re.search(r"handle_errors \{(.*?)\n\t\}", self.text, re.S).group(1)
        self.assertIn("import longview_archive_csp_strict *", errors)
        self.assertIn("import longview_archive_headers", errors)
        # Exactly one snippet sets each policy, with the matcher as its argument.
        self.assertEqual(len(re.findall(r"header \{args\[0\]\} Content-Security-Policy", self.text)), 2)

    def test_robots_blocked_by_caddy_itself(self):
        block = re.search(r"handle /robots\.txt \{(.*?)\n\t\}", self.text, re.S)
        self.assertIsNotNone(block)
        body = block.group(1)
        self.assertIn("respond <<TXT", body)
        self.assertIn("User-agent: *", body)
        self.assertIn("Disallow: /", body)
        self.assertRegex(body, r"(?m)^\t+TXT 200$")

    def test_serves_only_the_directory_and_status_paths(self):
        self.assertIn("@status path /status /status/ /status/* /status.json", self.text)
        self.assertRegex(self.text, r"handle / \{\s*redir \* /longview/businesses/ 302\s*\}")
        self.assertRegex(self.text, r"handle /longview/businesses \{\s*redir \* /longview/businesses/ 308\s*\}")
        block = re.search(r"handle /longview/businesses/\* \{(.*?)\n\t\}", self.text, re.S)
        self.assertIsNotNone(block)
        self.assertIn("try_files {path} {path}/index.html", block.group(1))
        self.assertIn("file_server", block.group(1))
        self.assertIn('respond "Not found" 404', self.text)
        self.assertIn("handle_errors", self.text)
        self.assertNotIn("/status/ 302", self.text)
        for word in ("reverse_proxy", "php_fastcgi", "localhost", "127.0.0.1", "import sites", "vercel"):
            self.assertNotIn(word, self.text.lower() if word == "vercel" else self.text)

    def test_tabs_and_header_comment(self):
        for number, line in enumerate(self.text.splitlines(), 1):
            with self.subTest(line=number):
                self.assertFalse(line.startswith(" "), "indent with tabs")
        header = self.text.split("\n\n")[0]
        for needle in ("Owner:", "/status", "/longview/businesses/", "uninstall.sh", "caddy validate", "2.7",
                       "noindex", "LVA_INDEXABLE", "approved change to this file", "DNS"):
            self.assertIn(needle, header)

    def test_caddy_accepts_it(self):
        caddy = shutil.which("caddy")
        if not caddy:
            self.skipTest("caddy not installed")
        with tempfile.TemporaryDirectory() as tmp:
            caddyfile = Path(tmp) / "Caddyfile"
            caddyfile.write_text(f"import {CADDY}\n")
            proc = subprocess.run(
                [caddy, "validate", "--config", str(caddyfile), "--adapter", "caddyfile"],
                capture_output=True, text=True, timeout=60,
                env={**os.environ, "HOME": tmp, "XDG_DATA_HOME": tmp, "XDG_CONFIG_HOME": tmp},
            )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)

    def test_caddy_serves_the_directory_and_status(self):
        """Run the real file on a free local port against a tiny www and check routes and headers."""
        caddy = shutil.which("caddy")
        if not caddy:
            self.skipTest("caddy not installed")
        with tempfile.TemporaryDirectory() as tmp:
            www = Path(tmp) / "www"
            build = www / "longview" / ".builds" / "b1"
            (build / "about").mkdir(parents=True)
            (build / "index.html").write_text("<h1>directory</h1>")
            (build / "about" / "index.html").write_text("<h1>about</h1>")
            (build / "search.js").write_text("/* js */")
            (www / "longview" / "businesses").symlink_to(Path(".builds") / "b1")
            (www / "status").mkdir()
            (www / "status" / "index.html").write_text("<h1>status</h1>")
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                port = sock.getsockname()[1]
            text = self.text.replace("longview.165-227-248-110.sslip.io {", f"http://127.0.0.1:{port} {{")
            text = text.replace("/var/lib/longview-archive/www", str(www))
            caddyfile = Path(tmp) / "Caddyfile"
            caddyfile.write_text("{\n\tadmin off\n}\n\n" + text)
            env = {**os.environ, "HOME": tmp, "XDG_DATA_HOME": tmp, "XDG_CONFIG_HOME": tmp}
            proc = subprocess.Popen([caddy, "run", "--config", str(caddyfile), "--adapter", "caddyfile"],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
            try:
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

                def get(path):
                    deadline = time.monotonic() + 15
                    while True:
                        try:
                            resp = opener.open(f"http://127.0.0.1:{port}{path}", timeout=5)
                            return resp.status, resp.headers
                        except urllib.error.HTTPError as exc:
                            return exc.code, exc.headers
                        except OSError:
                            if time.monotonic() > deadline:
                                raise
                            time.sleep(0.2)

                status, headers = get("/")
                self.assertEqual((status, headers["Location"]), (302, "/longview/businesses/"))
                for path in ("/longview/businesses/", "/longview/businesses/about", "/longview/businesses/about/",
                             "/longview/businesses/search.js"):
                    with self.subTest(path=path):
                        status, headers = get(path)
                        self.assertEqual(status, 200)
                        self.assertEqual(headers["Content-Security-Policy"], DIRECTORY_CSP)
                        self.assertIn("noindex", headers["X-Robots-Tag"])
                for path, want in (("/status/", 200), ("/longview/businesses/missing/", 404),
                                   ("/longview/.builds/b1/", 404), ("/elsewhere", 404)):
                    with self.subTest(path=path):
                        status, headers = get(path)
                        self.assertEqual(status, want)
                        self.assertEqual(headers["Content-Security-Policy"], STRICT_CSP)
                        self.assertIn("noindex", headers["X-Robots-Tag"])
                status, headers = get("/longview/businesses")
                self.assertEqual((status, headers["Location"]), (308, "/longview/businesses/"))
            finally:
                proc.terminate()
                proc.wait(timeout=30)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class ScriptStaticTest(unittest.TestCase):
    def test_bash_syntax(self):
        for script in SCRIPTS:
            with self.subTest(script=script.name):
                proc = subprocess.run([BASH, "-n", str(script)], capture_output=True, text=True)
                self.assertEqual(proc.returncode, 0, proc.stderr)

    def test_strict_mode_and_shebang(self):
        for script in SCRIPTS:
            with self.subTest(script=script.name):
                text = script.read_text()
                self.assertTrue(text.startswith("#!/usr/bin/env bash\n"))
        self.assertIn("\nset -euo pipefail\n", INSTALL.read_text())
        self.assertIn("\nset -euo pipefail\n", UNINSTALL.read_text())

    def test_no_forbidden_actions(self):
        for script in SCRIPTS:
            text = script.read_text()
            for needle in FORBIDDEN_IN_SCRIPTS:
                with self.subTest(script=script.name, needle=needle):
                    self.assertNotIn(needle, text)

    def test_preflight_never_reads_private_files(self):
        text = PREFLIGHT.read_text()
        for needle in ("/etc/pda", "/etc/brain", "/root", ".env"):
            self.assertNotIn(needle, text)
        for line in code_lines(PREFLIGHT):
            with self.subTest(line=line):
                self.assertNotRegex(line, r"\b(cat|head|tail|less|source)\b|^\. ")
                self.assertNotRegex(line, r"\b(rm|mv|cp|mkdir|touch|chmod|chown|install|useradd)\b")
                self.assertNotRegex(line, r"systemctl (start|stop|restart|reload|enable|disable)")

    def test_validate_before_reload(self):
        for script in (INSTALL, UNINSTALL):
            with self.subTest(script=script.name):
                code = "\n".join(code_lines(script))
                reload_at = code.find("systemctl reload caddy")
                validate_at = code.find("caddy validate")
                self.assertGreater(reload_at, -1)
                self.assertGreater(validate_at, -1)
                self.assertLess(validate_at, reload_at)

    def test_scripts_never_delete_data(self):
        for script in (INSTALL, UNINSTALL):
            for line in code_lines(script):
                if re.search(r"\brm\b", line):
                    with self.subTest(script=script.name, line=line):
                        self.assertNotIn("DATA_DIR", line)
                        self.assertNotIn("/var/lib", line)

    def test_test_hooks_are_documented_as_test_only(self):
        for script in (INSTALL, UNINSTALL):
            text = script.read_text()
            self.assertIn("LVA_INSTALL_PREFIX", text)
            self.assertIn("LVA_INSTALL_FAKE_SYSTEM", text)
            self.assertIn("Test-only", text)

    def test_shellcheck(self):
        shellcheck = shutil.which("shellcheck")
        if not shellcheck:
            self.skipTest("shellcheck not installed")
        proc = subprocess.run(
            [shellcheck, "-x", *map(str, SCRIPTS)], capture_output=True, text=True
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)


class ReadmeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = README.read_text()

    def one_liner(self, branch: str, script: str) -> str:
        return (
            "bash -c 'set -e; d=$(mktemp -d); trap \"rm -rf $d\" EXIT; "
            f"git clone --depth 1 --branch {branch} {REPO_URL} \"$d/src\"; "
            f"bash \"$d/src/deploy/longview-archive/{script}\"'"
        )

    def test_one_paste_install_for_branch_and_main(self):
        for branch in ("claude/serene-edison-daodg6", "main"):
            with self.subTest(branch=branch):
                command = self.one_liner(branch, "install.sh")
                self.assertIn(command, self.text)
                inner = command[len("bash -c '"):-1]
                proc = subprocess.run([BASH, "-n", "-c", inner], capture_output=True, text=True)
                self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn(self.one_liner("claude/serene-edison-daodg6", "preflight.sh"), self.text)
        dry = self.one_liner("claude/serene-edison-daodg6", "install.sh")[:-1] + " --dry-run'"
        self.assertTrue(dry.endswith('install.sh" --dry-run\''))
        self.assertIn(dry, self.text)
        proc = subprocess.run([BASH, "-n", "-c", dry[len("bash -c '"):-1]], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertNotIn("inside the closing quote", self.text)
        self.assertIn("Until the pull request merges", self.text)
        self.assertIn("After the pull request merges", self.text)

    def test_runbook_covers_the_operations(self):
        for needle in (
            f"https://{STATUS_HOST}/status/",
            "touch /var/lib/longview-archive/PAUSE",
            "rm -f /var/lib/longview-archive/PAUSE",
            "bash /opt/longview-archive/uninstall.sh",
            "journalctl -u longview-archive -n 100 --no-pager",
            f"https://{STATUS_HOST}/longview/businesses/",
            "status.json",
            "lva approve",
            "lva approve --auto on",
            "lva approve --auto off",
            "lva site",
            "more than 25%",
            "suppress --id",
            "review list",
            "$48/month",
            "Nothing here uses Vercel",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, self.text)

    def test_no_batch_pull_requests_or_vercel_steps(self):
        for gone in ("publish-pr", "github-token", "Automatic batch pull requests", "Merging the pull request is"
                     " the approval", "content/longview-directory/"):
            self.assertNotIn(gone, self.text)

    def test_uses_spec_command_names(self):
        used = set(re.findall(r"\blva ([a-z][a-z-]*)", self.text))
        self.assertTrue(used)
        self.assertLessEqual(used, SPEC_COMMANDS)

    def test_no_secrets(self):
        self.assertNotRegex(
            self.text,
            r"(?i)BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]|xai-[A-Za-z0-9]{8}|sk-[A-Za-z0-9]{8}|password\s*=",
        )


class SandboxInstallTest(unittest.TestCase):
    """install.sh and uninstall.sh end to end in a temporary directory."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="lva-deploy-test-"))
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        # A frozen copy of the deploy folder, so engine modules that are still
        # being edited cannot change under the comparison.
        self.src = self.tmp / "src"
        self.src.mkdir()
        for script in SCRIPTS:
            shutil.copy2(script, self.src / script.name)
        shutil.copytree(ROOT / "systemd", self.src / "systemd")
        shutil.copytree(ROOT / "caddy", self.src / "caddy")
        shutil.copytree(
            PACKAGE,
            self.src / "longview_archive",
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
        )
        cache = self.src / "longview_archive" / "__pycache__"
        cache.mkdir()
        (cache / "stale.cpython-312.pyc").write_bytes(b"not code")
        self.prefix = self.tmp / "root"
        self.make_system()

    def make_system(self, hostname="leadflow-web", os_id="ubuntu", imports=True):
        p = self.prefix
        (p / "etc" / "caddy" / "sites").mkdir(parents=True, exist_ok=True)
        (p / "etc" / "systemd" / "system").mkdir(parents=True, exist_ok=True)
        (p / "etc" / "os-release").write_text(f'NAME="Test"\nID={os_id}\nVERSION_ID="24.04"\n')
        (p / "etc" / "hostname").write_text(hostname + "\n")
        caddyfile = "{\n\temail ops@leadflow.example\n}\n\n"
        if imports:
            caddyfile += "import sites/*.caddy\n"
        (p / "etc" / "caddy" / "Caddyfile").write_text(caddyfile)
        self.other_site = p / "etc" / "caddy" / "sites" / "other-site.caddy"
        self.other_site.write_text('other.example {\n\trespond "other"\n}\n')
        self.fake = p / ".fake-system"
        self.fake.mkdir(exist_ok=True)
        (self.fake / "active-caddy").touch()

    def run_script(self, name, *args, env=None):
        """Run a script from the frozen source copy, or any path given."""
        full_env = {k: v for k, v in os.environ.items() if not k.startswith("LVA_")}
        full_env.update(LVA_INSTALL_PREFIX=str(self.prefix), LVA_INSTALL_FAKE_SYSTEM="1")
        full_env.update(env or {})
        script = name if isinstance(name, Path) else self.src / name
        return subprocess.run(
            [BASH, str(script), *args],
            env=full_env, capture_output=True, text=True, timeout=180,
        )

    def install(self, *args):
        proc = self.run_script("install.sh", *args)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        return proc

    def calls(self) -> list:
        log = self.fake / "calls.log"
        return log.read_text().splitlines() if log.exists() else []

    def reset_calls(self):
        (self.fake / "calls.log").unlink(missing_ok=True)

    def index_of(self, calls, needle) -> int:
        for i, call in enumerate(calls):
            if needle in call:
                return i
        self.fail(f"no call containing {needle!r} in {calls}")

    def tree(self) -> dict:
        # The fake system's own bookkeeping is left out: its change log is
        # checked through calls(), and reads.log records read-only checks.
        return {
            str(path.relative_to(self.prefix)): (path.stat().st_mode, path.stat().st_mtime_ns)
            for path in self.prefix.rglob("*")
            if ".fake-system" not in path.relative_to(self.prefix).parts
        }

    @property
    def opt(self) -> Path:
        return self.prefix / "opt" / "longview-archive"

    @property
    def data(self) -> Path:
        return self.prefix / "var" / "lib" / "longview-archive"

    @property
    def unit(self) -> Path:
        return self.prefix / "etc" / "systemd" / "system" / "longview-archive.service"

    @property
    def site(self) -> Path:
        return self.prefix / "etc" / "caddy" / "sites" / "longview-archive.caddy"

    def test_full_install_layout(self):
        proc = self.install()
        out = proc.stdout

        self.assertEqual(mode(self.opt), 0o755)
        app = self.opt / "app"
        self.assertEqual(mode(app), 0o755)
        self.assertFalse((self.opt / "app.staging").exists())
        self.assertFalse((self.opt / "app.previous").exists())

        source_files = {
            p.relative_to(self.src): p.read_bytes()
            for p in (self.src / "longview_archive").rglob("*")
            if p.is_file() and "__pycache__" not in p.parts
        }
        installed = {
            p.relative_to(app): p for p in (app / "longview_archive").rglob("*") if p.is_file()
        }
        self.assertIn(Path("longview_archive/__init__.py"), installed)
        self.assertEqual(set(installed), set(source_files))
        for rel, path in installed.items():
            with self.subTest(file=str(rel)):
                self.assertEqual(path.read_bytes(), source_files[rel])
                self.assertEqual(mode(path), 0o644)
        for path in app.rglob("*"):
            if path.is_dir():
                self.assertEqual(mode(path), 0o755, path)
        self.assertFalse(list(app.rglob("__pycache__")))
        self.assertFalse(list(app.rglob("*.pyc")))

        venv = self.opt / "venv"
        self.assertTrue((venv / "pyvenv.cfg").is_file())
        self.assertTrue(os.access(venv / "bin" / "python", os.X_OK))
        self.assertFalse(list((venv / "bin").glob("pip*")), "venv must be created --without-pip")

        for name in ("uninstall.sh", "preflight.sh"):
            with self.subTest(script=name):
                self.assertEqual((self.opt / name).read_bytes(), (self.src / name).read_bytes())
                self.assertEqual(mode(self.opt / name), 0o755)

        expected_modes = {
            "": 0o711,
            "db": 0o700,
            "backups": 0o700,
            "exports": 0o700,
            "exports/publish": 0o700,
            "exports/private": 0o700,
            "www": 0o755,
            "www/status": 0o755,
        }
        for rel, want in expected_modes.items():
            with self.subTest(dir=rel or "."):
                path = self.data / rel if rel else self.data
                self.assertTrue(path.is_dir())
                self.assertEqual(mode(path), want)

        self.assertEqual(self.unit.read_bytes(), (self.src / "systemd" / "longview-archive.service").read_bytes())
        self.assertEqual(mode(self.unit), 0o644)
        self.assertEqual(self.site.read_bytes(), (self.src / "caddy" / "longview-archive.caddy").read_bytes())
        self.assertEqual(mode(self.site), 0o644)
        self.assertEqual(self.other_site.read_text(), 'other.example {\n\trespond "other"\n}\n')
        self.assertEqual(
            sorted(p.name for p in (self.prefix / "etc" / "caddy" / "sites").iterdir()),
            ["longview-archive.caddy", "other-site.caddy"],
        )

        calls = self.calls()
        useradd = calls[self.index_of(calls, "useradd")]
        for flag in ("--system", "--no-create-home", "--home-dir /nonexistent", "--shell /usr/sbin/nologin"):
            self.assertIn(flag, useradd)
        self.assertTrue(useradd.endswith(" lvarchive"))
        # Root changes only the top data folder, never following a link, and
        # never anything below it; the service user makes the subfolders.
        self.assertIn(f"chown -h lvarchive:lvarchive {self.data}", calls)
        for call in calls:
            if call.startswith("chown"):
                with self.subTest(call=call):
                    self.assertNotIn(f"{self.data}/", call)
                    self.assertNotIn("-R lvarchive", call)
        self.assertIn(
            f"runuser -u lvarchive -- install -d -m 0700 {self.data}/db {self.data}/backups "
            f"{self.data}/exports {self.data}/exports/publish {self.data}/exports/private",
            calls,
        )
        self.assertIn(
            f"runuser -u lvarchive -- install -d -m 0755 {self.data}/www {self.data}/www/status", calls
        )
        self.assertIn(f"chown -R root:root {self.opt / 'app.staging'}", calls)

        # The new code migrates and checks itself from the staging copy,
        # before it replaces the installed one.
        stage = self.opt / "app.staging"
        migrate = self.index_of(calls, "-m longview_archive migrate")
        check = self.index_of(calls, "-m longview_archive check")
        for call in (calls[migrate], calls[check]):
            self.assertTrue(call.startswith("runuser -u lvarchive -- "))
            self.assertIn(f"env -C {stage} PYTHONPATH={stage} ", call)
        self.assertIn("caddy validate", (self.fake / "reads.log").read_text())
        reload_daemon = calls.index("systemctl daemon-reload")
        enable = calls.index("systemctl enable --now longview-archive")
        validate = calls.index(
            f"caddy validate --config {self.prefix}/etc/caddy/Caddyfile --adapter caddyfile"
        )
        reload_caddy = calls.index("systemctl reload caddy")
        self.assertLess(migrate, check)
        self.assertLess(check, reload_daemon)
        self.assertLess(reload_daemon, enable)
        self.assertLess(enable, validate)
        self.assertLess(validate, reload_caddy)
        self.assertTrue((self.fake / "active-longview-archive").exists())

        self.assertIn(f"https://{STATUS_HOST}/status/", out)
        self.assertIn(f"touch {self.data}/PAUSE", out)
        self.assertIn(f"rm -f {self.data}/PAUSE", out)
        self.assertIn(f"bash {self.opt}/uninstall.sh", out)
        self.assertIn("-p CPUQuotaPerSecUSec -p MemoryMax -p IPAddressDeny", out)

    def test_rerun_is_idempotent_and_upgrades(self):
        self.install()
        # Pretend the installed copy is an older release.
        (self.opt / "app" / "OLDER_RELEASE").write_text("old\n")
        self.reset_calls()

        self.install()
        calls = self.calls()
        self.assertTrue((self.opt / "app.previous" / "OLDER_RELEASE").exists())
        self.assertFalse((self.opt / "app" / "OLDER_RELEASE").exists())
        self.assertFalse(any(c.startswith("useradd") for c in calls), calls)
        self.assertIn("systemctl restart longview-archive", calls)
        self.assertNotIn("systemctl enable --now longview-archive", calls)
        self.assertFalse(any("caddy" in c for c in calls if not c.startswith("chown")), calls)

        # Same code again: app.previous keeps the real previous release.
        self.reset_calls()
        proc = self.install()
        self.assertIn("Code unchanged", proc.stdout)
        self.assertTrue((self.opt / "app.previous" / "OLDER_RELEASE").exists())
        self.assertIn("systemctl restart longview-archive", self.calls())

    def test_dry_run_changes_nothing(self):
        before = self.tree()
        proc = self.install("--dry-run")
        self.assertEqual(self.tree(), before)
        self.assertEqual(self.calls(), [])
        for needle in (
            "[dry-run] useradd",
            "[dry-run] python3 -m venv --without-pip",
            "[dry-run] systemctl enable --now longview-archive",
            "[dry-run] caddy validate",
            "[dry-run] systemctl reload caddy",
            "Nothing was changed",
        ):
            self.assertIn(needle, proc.stdout)

        self.install()
        before = self.tree()
        proc = self.run_script("uninstall.sh", "--dry-run", "--remove-code")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertEqual(self.tree(), before)
        self.assertIn("[dry-run] rm -rf", proc.stdout)

    def test_uninstall_keeps_data(self):
        self.install()
        (self.data / "db" / "archive.db").write_bytes(b"archive")
        (self.data / "www" / "status.json").write_text("{}\n")
        self.reset_calls()

        proc = self.run_script("uninstall.sh")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        calls = self.calls()
        self.assertFalse(self.unit.exists())
        self.assertFalse(self.site.exists())
        self.assertTrue(self.other_site.exists())
        self.assertEqual((self.data / "db" / "archive.db").read_bytes(), b"archive")
        self.assertTrue((self.data / "www" / "status.json").exists())
        self.assertTrue((self.opt / "app").is_dir())
        stop = calls.index("systemctl stop longview-archive")
        disable = calls.index("systemctl disable longview-archive")
        daemon = calls.index("systemctl daemon-reload")
        validate = self.index_of(calls, "caddy validate --config")
        reload_caddy = calls.index("systemctl reload caddy")
        self.assertLess(stop, disable)
        self.assertLess(disable, daemon)
        self.assertLess(validate, reload_caddy)
        self.assertFalse((self.fake / "active-longview-archive").exists())
        self.assertIn(f"rm -rf {self.data}", proc.stdout)  # printed, not run

        # Again: nothing left to do, still fine.
        self.reset_calls()
        proc = self.run_script("uninstall.sh")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertEqual(self.calls(), [])

        # The copy the runbook points at deletes itself here; it must finish.
        proc = self.run_script(self.opt / "uninstall.sh", "--remove-code")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertIn("Re-run the install one-liner", proc.stdout)
        self.assertFalse(self.opt.exists())
        self.assertEqual((self.data / "db" / "archive.db").read_bytes(), b"archive")
        self.assertEqual(mode(self.data), 0o711)

    def test_rejected_caddy_config_is_rolled_back_without_reload(self):
        (self.fake / "caddy-validate-fails").touch()
        proc = self.run_script("install.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("NOT reloaded", proc.stderr)
        self.assertFalse(self.site.exists())
        self.assertTrue(self.other_site.exists())
        self.assertIn("caddy validate", "\n".join(self.calls()))
        self.assertNotIn("systemctl reload caddy", self.calls())

        # An existing, different site file comes back byte for byte.
        (self.fake / "caddy-validate-fails").unlink()
        self.install()
        older = "# an older release\n" + self.site.read_text()
        self.site.write_text(older)
        (self.fake / "caddy-validate-fails").touch()
        self.reset_calls()
        proc = self.run_script("install.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertEqual(self.site.read_text(), older)
        self.assertNotIn("systemctl reload caddy", self.calls())

        # The rollback puts the site file back too when Caddy says no.
        self.reset_calls()
        proc = self.run_script("uninstall.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertEqual(self.site.read_text(), older)
        self.assertNotIn("systemctl reload caddy", self.calls())

    def test_symlinked_data_folder_is_refused_and_not_followed(self):
        self.install()
        victim = self.tmp / "victim"
        victim.mkdir()
        victim.chmod(0o750)
        before = victim.stat()
        for rel in ("www", "exports/private", "db"):
            with self.subTest(link=rel):
                target = self.data / rel
                moved = target.with_name(target.name + ".real")
                target.rename(moved)
                target.symlink_to(victim)
                self.reset_calls()
                proc = self.run_script("install.sh")
                self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
                self.assertIn("is a symbolic link", proc.stderr)
                self.assertEqual(self.calls(), [])
                after = victim.stat()
                self.assertEqual(stat.S_IMODE(after.st_mode), 0o750)
                self.assertEqual((after.st_uid, after.st_gid), (before.st_uid, before.st_gid))
                target.unlink()
                moved.rename(target)
        self.install()

    def test_symlinked_top_data_folder_is_refused(self):
        victim = self.tmp / "victim"
        victim.mkdir()
        self.data.parent.mkdir(parents=True)
        self.data.symlink_to(victim)
        proc = self.run_script("install.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("is a symbolic link", proc.stderr)
        self.assertEqual(self.calls(), [])
        self.assertFalse(self.opt.exists())

    def test_broken_caddy_config_stops_before_any_change(self):
        (self.fake / "caddy-config-broken").touch()
        self.assert_refused(self.run_script("install.sh"), "current config does not validate")
        self.install("--no-caddy")

    def test_failed_migrate_or_check_keeps_the_installed_code(self):
        self.install()
        (self.opt / "app" / "OLDER_RELEASE").write_text("old\n")
        for knob in ("engine-migrate-fails", "engine-check-fails"):
            with self.subTest(knob=knob):
                (self.fake / knob).touch()
                self.reset_calls()
                proc = self.run_script("install.sh")
                self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
                self.assertIn("was not installed", proc.stderr)
                self.assertTrue((self.opt / "app" / "OLDER_RELEASE").exists())
                self.assertFalse((self.opt / "app.staging").exists())
                self.assertFalse((self.opt / "app.previous").exists())
                calls = self.calls()
                self.assertFalse(any(c.startswith("systemctl") for c in calls), calls)
                (self.fake / knob).unlink()

    def test_unhealthy_new_engine_rolls_back_to_previous(self):
        self.install()
        unit_before = self.unit.read_bytes()
        (self.opt / "app" / "OLDER_RELEASE").write_text("old\n")
        # The source unit changes too, so the rollback must restore it.
        src_unit = self.src / "systemd" / "longview-archive.service"
        src_unit.write_text(src_unit.read_text() + "# newer release\n")
        (self.fake / "engine-unhealthy").touch()
        self.reset_calls()
        proc = self.run_script("install.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("previous release is back in place", proc.stderr)
        self.assertTrue((self.opt / "app" / "OLDER_RELEASE").exists())
        self.assertFalse((self.opt / "app.previous").exists())
        self.assertEqual(self.unit.read_bytes(), unit_before)
        calls = self.calls()
        restart = calls.index("systemctl restart longview-archive")
        stop = calls.index("systemctl stop longview-archive")
        start = calls.index("systemctl start longview-archive")
        self.assertLess(restart, stop)
        self.assertLess(stop, start)
        self.assertLess(stop, len(calls) - 1 - calls[::-1].index("systemctl daemon-reload"))

    def test_unhealthy_fresh_install_has_nothing_to_roll_back(self):
        (self.fake / "engine-unhealthy").touch()
        proc = self.run_script("install.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("nothing to roll back", proc.stderr)
        self.assertNotIn("systemctl stop longview-archive", self.calls())

    def assert_refused(self, proc, message):
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn(message, proc.stderr)
        self.assertFalse(self.opt.exists())
        self.assertFalse(self.data.exists())
        self.assertEqual(self.calls(), [])

    def test_refuses_wrong_host_unless_any_host(self):
        self.make_system(hostname="some-other-box")
        self.assert_refused(self.run_script("install.sh"), "not leadflow-web")
        self.install("--any-host")

    def test_refuses_non_ubuntu(self):
        self.make_system(os_id="debian")
        self.assert_refused(self.run_script("install.sh"), "not Ubuntu")

    def test_refuses_caddyfile_without_sites_import(self):
        self.make_system(imports=False)
        self.assert_refused(self.run_script("install.sh"), "does not import sites/*.caddy")

    def test_refuses_old_caddy_unless_no_caddy(self):
        (self.fake / "caddy-version").write_text("v2.6.4 h1:old\n")
        self.assert_refused(self.run_script("install.sh"), "needs Caddy 2.7 or newer")
        self.install("--no-caddy")
        self.assertFalse(self.site.exists())
        self.assertFalse(any("caddy" in c for c in self.calls() if not c.startswith("chown")))

    def test_refuses_stopped_caddy(self):
        (self.fake / "active-caddy").unlink()
        self.assert_refused(self.run_script("install.sh"), "Caddy is not running")

    def test_refuses_low_disk(self):
        (self.fake / "free-kb").write_text(str(5 * 1024 * 1024))
        self.assert_refused(self.run_script("install.sh"), "at least 10 GB")

    def test_test_hooks_only_work_together(self):
        # --dry-run as well, so even a broken guard could not change anything.
        clean = {k: v for k, v in os.environ.items() if not k.startswith("LVA_")}
        for name in ("install.sh", "uninstall.sh"):
            for extra in ({"LVA_INSTALL_FAKE_SYSTEM": "1"}, {"LVA_INSTALL_PREFIX": str(self.prefix)}):
                with self.subTest(script=name, env=sorted(extra)):
                    proc = subprocess.run(
                        [BASH, str(self.src / name), "--dry-run"],
                        env={**clean, **extra}, capture_output=True, text=True, timeout=60,
                    )
                    self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
                    self.assertIn("test-only and go together", proc.stderr)

    def test_unknown_option_is_refused(self):
        proc = self.run_script("install.sh", "--yes")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("Unknown option", proc.stderr)


    # ------------------------------------------------ website routes and public host

    @property
    def routes(self) -> Path:
        return self.prefix / "etc" / "caddy" / "longview-archive" / "website.routes"

    @property
    def errors(self) -> Path:
        return self.prefix / "etc" / "caddy" / "longview-archive" / "website.errors"

    @property
    def env_file(self) -> Path:
        return self.prefix / "etc" / "longview-archive" / "env"

    def fake_dns(self, public_ip=None, aaaa=None, **answers):
        """The metadata service's answer and getent's answers (host -> list of
        IPv4; aaaa: host -> list of IPv6). public_ip "" removes the answer."""
        if public_ip == "":
            (self.fake / "public-ip").unlink(missing_ok=True)
        elif public_ip is not None:
            (self.fake / "public-ip").write_text(public_ip)
        for folder, table in (("dns", answers), ("dns6", aaaa or {})):
            dns = self.fake / folder
            dns.mkdir(exist_ok=True)
            for host, ips in table.items():
                (dns / host).write_text("".join(ip + "\n" for ip in ips))

    def install_public(self, host=PUBLIC_HOST, *args, code=0):
        proc = self.run_script("install.sh", *args, env={"LVA_PUBLIC_HOST": host})
        self.assertEqual(proc.returncode, code, proc.stdout + proc.stderr)
        return proc

    def expected_public_site(self, host=PUBLIC_HOST) -> str:
        return CADDY.read_text() + PUBLIC_TEMPLATE.read_text().replace("@PUBLIC_HOST@", host)

    def serve_public_host(self):
        """A first install with the public host live; returns the env file bytes."""
        self.fake_dns(DROPLET_IP, **{PUBLIC_HOST: [DROPLET_IP]})
        self.install_public()
        self.assertEqual(self.site.read_text(), self.expected_public_site())
        return self.env_file.read_bytes()

    def test_website_routes_installed_and_removed(self):
        proc = self.install()
        self.assertEqual(self.routes.read_bytes(), ROUTES.read_bytes())
        self.assertEqual(self.errors.read_bytes(), ERRORS.read_bytes())
        self.assertEqual(mode(self.routes), 0o644)
        self.assertEqual(mode(self.errors), 0o644)
        self.assertEqual(mode(self.routes.parent), 0o755)
        # No public host asked for: the site file is the staging host only and
        # no settings file is written.
        self.assertEqual(self.site.read_bytes(), CADDY.read_bytes())
        self.assertFalse(self.env_file.exists())
        self.assertFalse(self.env_file.parent.exists())
        calls = self.calls()
        routes_at = calls.index(f"chown root:root {self.routes.parent} {self.routes} {self.errors} {self.site}")
        self.assertLess(routes_at, self.index_of(calls, "caddy validate"))
        self.assertIn("https://www.theleadflowpro.com/longview/businesses/", proc.stdout)
        self.assertIn("LVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com", proc.stdout)

        # A changed routes or errors file alone is put back and Caddy reloaded.
        for path, source in ((self.routes, ROUTES), (self.errors, ERRORS)):
            with self.subTest(path=path.name):
                path.write_text("# older\n")
                self.reset_calls()
                self.install()
                self.assertEqual(path.read_bytes(), source.read_bytes())
                self.assertIn("systemctl reload caddy", self.calls())

        proc = self.run_script("uninstall.sh")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertFalse(self.routes.exists())
        self.assertFalse(self.errors.exists())
        self.assertFalse(self.routes.parent.exists())
        self.assertFalse(self.site.exists())

    def test_rejected_config_puts_the_routes_back_too(self):
        self.install()
        self.routes.write_text("# older routes\n")
        self.errors.unlink()
        self.site.write_text("# older site\n")
        (self.fake / "caddy-validate-fails").touch()
        self.reset_calls()
        proc = self.run_script("install.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertEqual(self.routes.read_text(), "# older routes\n")
        self.assertFalse(self.errors.exists(), "a file that was not there is removed again")
        self.assertEqual(self.site.read_text(), "# older site\n")
        self.assertNotIn("systemctl reload caddy", self.calls())

        self.errors.write_text("# older errors\n")
        proc = self.run_script("uninstall.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertEqual(self.routes.read_text(), "# older routes\n")
        self.assertEqual(self.errors.read_text(), "# older errors\n")
        self.assertEqual(self.site.read_text(), "# older site\n")

    def test_public_host_added_when_dns_points_here(self):
        self.fake_dns(DROPLET_IP, **{PUBLIC_HOST: [DROPLET_IP]})
        proc = self.install_public(PUBLIC_HOST.upper())
        site = self.site.read_text()
        self.assertEqual(site, self.expected_public_site())
        self.assertRegex(site, r"(?m)^longview\.theleadflowpro\.com \{$")
        # The status pages stay on the staging host only.
        self.assertEqual(site.count("@status path"), 1)
        public_block = site.split("\nlongview.theleadflowpro.com {", 1)[1]
        self.assertNotRegex(public_block, r"/status|@status")
        self.assertIn("import /etc/caddy/longview-archive/website.routes", public_block)
        self.assertEqual(self.routes.read_bytes(), ROUTES.read_bytes())
        self.assertIn(f"https://{PUBLIC_HOST}/longview/businesses/", proc.stdout)

        # The engine's links follow, through the one settings file.
        self.assertEqual(mode(self.env_file), 0o644)
        self.assertEqual(
            config.read_env_file(self.env_file),
            {"LVA_PUBLIC_HOST": PUBLIC_HOST, "LVA_PUBLIC_BASE_URL": f"https://{PUBLIC_HOST}"},
        )
        self.assertEqual(config.load_settings(config.environment({}, self.env_file)).public_base_url,
                         f"https://{PUBLIC_HOST}")
        # Only after Caddy took the host, and the engine restarts to read it.
        calls = self.calls()
        env_at = calls.index(f"chown root:root {self.env_file.parent} {self.env_file}")
        self.assertLess(self.index_of(calls, "systemctl reload caddy"), env_at)
        self.assertLess(self.index_of(calls, "-m longview_archive migrate"), env_at)
        self.assertIn("systemctl restart longview-archive", calls[env_at:])

        # Again: nothing changes and Caddy and the engine are left alone.
        before = self.env_file.read_bytes()
        self.reset_calls()
        proc = self.install_public()
        self.assertIn(f"Already LVA_PUBLIC_BASE_URL=https://{PUBLIC_HOST}", proc.stdout)
        self.assertEqual(self.env_file.read_bytes(), before)
        self.assertFalse(any("caddy" in c for c in self.calls() if not c.startswith("chown")), self.calls())

        # The upgrade (the plain one-liner, no variable) keeps the recorded host.
        proc = self.install()
        self.assertEqual(self.site.read_text(), self.expected_public_site())
        self.assertEqual(self.env_file.read_bytes(), before)

        # A different host while one is recorded is refused before any change.
        self.reset_calls()
        proc = self.install_public("dir.theleadflowpro.com", code=1)
        self.assertIn("already names another public host", proc.stderr)
        self.assertEqual(self.calls(), [])

    def test_served_host_is_kept_when_a_later_check_fails(self):
        before = self.serve_public_host()
        cases = (
            ("metadata unreachable", "", {PUBLIC_HOST: [DROPLET_IP]}),
            ("no DNS answer", DROPLET_IP, {PUBLIC_HOST: []}),
            ("DNS points elsewhere", DROPLET_IP, {PUBLIC_HOST: ["198.51.100.7"]}),
        )
        for label, public_ip, answers in cases:
            with self.subTest(case=label):
                self.fake_dns(public_ip, **answers)
                self.reset_calls()
                proc = self.install()  # the plain upgrade, no variable
                self.assertIn("WARNING", proc.stdout)
                self.assertIn("KEPT", proc.stdout)
                self.assertIn("delete the LVA_PUBLIC_HOST and LVA_PUBLIC_BASE_URL", proc.stdout)
                self.assertEqual(self.site.read_text(), self.expected_public_site())
                self.assertEqual(self.env_file.read_bytes(), before)
                self.assertNotIn("systemctl reload caddy", self.calls())
                self.assertIn(f"Directory: https://{PUBLIC_HOST}/longview/businesses/", proc.stdout)

    def test_recorded_host_that_is_not_served_stops_before_any_change(self):
        self.serve_public_host()
        self.site.write_bytes(CADDY.read_bytes())  # say someone took the block out by hand
        self.fake_dns("")
        self.reset_calls()
        proc = self.run_script("install.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("records LVA_PUBLIC_HOST", proc.stderr)
        self.assertIn("Nothing was changed", proc.stderr)
        self.assertIn("Type: A    Name: longview    Value: 165.227.248.110", proc.stdout)
        self.assertEqual(self.calls(), [])

    def test_dropping_the_host_while_links_point_at_it_is_refused(self):
        self.serve_public_host()
        # The owner deletes only the LVA_PUBLIC_HOST line.
        self.env_file.write_text(f"LVA_PUBLIC_BASE_URL=https://{PUBLIC_HOST}\n")
        self.reset_calls()
        proc = self.run_script("install.sh")
        self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
        self.assertIn("would stop serving", proc.stderr)
        self.assertEqual(self.calls(), [])
        self.assertEqual(self.site.read_text(), self.expected_public_site())

        # With both lines gone the host is taken out (links are back on staging).
        self.env_file.write_text("# nothing\n")
        self.install()
        self.assertEqual(self.site.read_bytes(), CADDY.read_bytes())

    def test_env_file_waits_for_caddy(self):
        self.install()
        self.fake_dns(DROPLET_IP, **{PUBLIC_HOST: [DROPLET_IP]})
        for failure in ("caddy-validate-fails", "caddy-reload-fails"):
            with self.subTest(failure=failure):
                (self.fake / failure).touch()
                self.addCleanup((self.fake / failure).unlink, missing_ok=True)
                proc = self.install_public(code=1)
                self.assertIn("put back", proc.stderr)
                self.assertFalse(self.env_file.exists())
                self.assertEqual(self.site.read_bytes(), CADDY.read_bytes())
                (self.fake / failure).unlink()

    def test_public_host_left_out_until_dns_points_here(self):
        record = "Type: A    Name: longview    Value: 165.227.248.110"
        cases = (
            ("points elsewhere", DROPLET_IP, {PUBLIC_HOST: ["198.51.100.7"]}, None, "not this droplet"),
            ("no record yet", DROPLET_IP, {}, None, "no A record"),
            ("metadata unreachable", None, {PUBLIC_HOST: [DROPLET_IP]}, None, "metadata service"),
            # Let's Encrypt may try any address the name has.
            ("an extra A record", DROPLET_IP, {PUBLIC_HOST: ["203.0.113.9", DROPLET_IP]}, None,
             "delete the A record(s) for 203.0.113.9"),
            ("an AAAA record", DROPLET_IP, {PUBLIC_HOST: [DROPLET_IP]}, {PUBLIC_HOST: ["2001:db8::1"]},
             "AAAA (IPv6) record, 2001:db8::1"),
        )
        for label, public_ip, answers, aaaa, why in cases:
            with self.subTest(case=label):
                shutil.rmtree(self.prefix)
                self.make_system()
                self.fake_dns(public_ip, aaaa, **answers)
                proc = self.install_public()
                self.assertIn(record, proc.stdout)
                self.assertIn(why, proc.stdout)
                self.assertIn("left out", proc.stdout)
                self.assertEqual(self.site.read_bytes(), CADDY.read_bytes())
                self.assertNotIn(PUBLIC_HOST, self.site.read_text())
                self.assertEqual(self.routes.read_bytes(), ROUTES.read_bytes())
                self.assertFalse(self.env_file.exists())
        # IPv4 answers mapped into IPv6 by getent are not AAAA records.
        shutil.rmtree(self.prefix)
        self.make_system()
        self.fake_dns(DROPLET_IP, {PUBLIC_HOST: ["::ffff:" + DROPLET_IP]}, **{PUBLIC_HOST: [DROPLET_IP]})
        self.install_public()
        self.assertEqual(self.site.read_text(), self.expected_public_site())

    def test_public_host_keeps_the_owners_base_url(self):
        self.env_file.parent.mkdir(parents=True)
        owner = "# set by the owner\nLVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com  # main site\n"
        self.env_file.write_text(owner)
        self.fake_dns(DROPLET_IP, **{PUBLIC_HOST: [DROPLET_IP]})
        proc = self.install_public()
        self.assertIn("Kept the existing LVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com (", proc.stdout)
        self.assertEqual(self.env_file.read_text(), owner + f"LVA_PUBLIC_HOST={PUBLIC_HOST}\n")
        self.assertIn(f"\n{PUBLIC_HOST} {{", self.site.read_text())
        self.assertIn("Directory: https://www.theleadflowpro.com/longview/businesses/", proc.stdout)

        # A file without the keys (and no final newline) gets them on lines of their own.
        self.env_file.write_text("# kept")
        self.install_public()
        self.assertTrue(self.env_file.read_text().startswith("# kept\n"))
        self.assertEqual(
            config.read_env_file(self.env_file),
            {"LVA_PUBLIC_HOST": PUBLIC_HOST, "LVA_PUBLIC_BASE_URL": f"https://{PUBLIC_HOST}"},
        )

    def test_env_file_the_engine_would_refuse_stops_the_installer(self):
        self.env_file.parent.mkdir(parents=True)
        for text, why in (
            ("LVA_ALLOW_PRIVATE_HOSTS=1\n", "LVA_ALLOW_PRIVATE_HOSTS cannot be set there"),
            ("LVA_INDEXABLE=1\n", "LVA_INDEXABLE cannot be set there"),
            ("LVA_PUBLIC_HOST='longview.theleadflowpro.com\n", "unclosed quote"),
        ):
            with self.subTest(text=text):
                self.env_file.write_text(text)
                self.reset_calls()
                proc = self.run_script("install.sh")
                self.assertEqual(proc.returncode, 1, proc.stdout + proc.stderr)
                self.assertIn(why, proc.stderr)
                self.assertIn("Nothing was changed", proc.stderr)
                self.assertEqual(self.calls(), [])

    def test_public_host_bad_values_are_refused_before_any_change(self):
        self.fake_dns(DROPLET_IP, **{PUBLIC_HOST: [DROPLET_IP]})
        for host, args in (
            ("not a host", ()),
            ("longview.theleadflowpro.com/x", ()),
            ("-bad.theleadflowpro.com", ()),
            ("www.theleadflowpro.com", ()),
            ("theleadflowpro.com", ()),
            (STATUS_HOST, ()),
            (PUBLIC_HOST, ("--no-caddy",)),
        ):
            with self.subTest(host=host, args=args):
                proc = self.install_public(host, *args, code=1)
                self.assertIn("Nothing was changed", proc.stderr)
                self.assertEqual(self.calls(), [])
                self.assertFalse(self.site.exists())

    def test_public_host_dry_run_changes_nothing(self):
        self.fake_dns(DROPLET_IP, **{PUBLIC_HOST: [DROPLET_IP]})
        before = self.tree()
        proc = self.install_public(PUBLIC_HOST, "--dry-run")
        self.assertEqual(self.tree(), before)
        self.assertEqual(self.calls(), [])
        self.assertIn(f"LVA_PUBLIC_BASE_URL=https://{PUBLIC_HOST} to", proc.stdout)
        self.assertIn("[dry-run] add LVA_PUBLIC_HOST=", proc.stdout)


class WebsitePathTest(unittest.TestCase):
    """The directory on www.theleadflowpro.com and on the optional public host."""

    @classmethod
    def setUpClass(cls):
        cls.routes = ROUTES.read_text()
        cls.site = WEBSITE_CADDY.read_text()
        cls.template = PUBLIC_TEMPLATE.read_text()

    @staticmethod
    def code(text: str) -> str:
        return "\n".join(l for l in text.splitlines() if l.strip() and not l.lstrip().startswith("#"))

    def test_routes_fragment_is_self_contained(self):
        code = self.code(self.routes)
        self.assertNotRegex(code, r"(?m)^\s*import\b", "no snippet from another file")
        self.assertIn("@longview_archive_directory path /longview/businesses /longview/businesses/*", code)
        self.assertRegex(code, r"(?m)^handle @longview_archive_directory \{$")
        self.assertRegex(code, r"(?m)^\troot \* /var/lib/longview-archive/www$")
        # Exactly one top-level handle, so it is mutually exclusive with the
        # importing site's own handle blocks.
        self.assertEqual(len(re.findall(r"(?m)^handle\b", code)), 1)
        self.assertEqual(len(re.findall(r"(?m)^[^\s}]", code)), 2)
        self.assertRegex(code, r"handle /longview/businesses \{\s*redir \* /longview/businesses/ 308\s*\}")
        self.assertIn("try_files {path} {path}/index.html", code)
        self.assertIn("file_server", code)
        self.assertIn('respond "Not found" 404', code)
        for word in ("status", "reverse_proxy", "browse", "127.0.0.1", "vercel", "supabase"):
            self.assertNotIn(word, code.lower())
        for number, line in enumerate(self.routes.splitlines(), 1):
            with self.subTest(line=number):
                self.assertFalse(line.startswith(" "), "indent with tabs")

    def test_routes_use_the_staging_directory_headers(self):
        staging = CADDY.read_text()
        snippet = re.search(r"\(longview_archive_headers\) \{\n\theader \{\n(.*?)\n\t\}", staging, re.S).group(1)
        want = sorted(l.strip() for l in snippet.splitlines() if l.strip())
        block = re.search(r"\n\theader \{\n(.*?)\n\t\}", self.routes, re.S).group(1)
        got = [l.strip() for l in block.splitlines() if l.strip()]
        self.assertEqual(sorted(l for l in got if not l.startswith("Content-Security-Policy")), want)
        self.assertIn('X-Robots-Tag "noindex, nofollow, noarchive, nosnippet"', got)
        self.assertEqual(re.findall(r'Content-Security-Policy "([^"]+)"', self.routes), [DIRECTORY_CSP])

    def test_website_block_imports_the_routes_before_its_app_fallback(self):
        www = re.search(r"(?ms)^www\.theleadflowpro\.com \{\n(.*?)^\}", self.site).group(1)
        lines = [l for l in www.splitlines() if l.strip()]
        self.assertIn("\timport /etc/caddy/longview-archive/*.routes", lines)
        # The app is the fallback handle: every path the routes do not claim.
        self.assertRegex(www, r"\n\thandle \{\n\t\treverse_proxy 127\.0\.0\.1:3100\n\t\}\n")
        self.assertEqual(self.site.count("reverse_proxy"), 1)
        self.assertLess(www.index("import /etc/caddy/longview-archive/*.routes"), www.index("\thandle {"))
        self.assertIn('header Strict-Transport-Security "max-age=63072000"', www)
        self.assertRegex(self.site, r"(?m)^theleadflowpro\.com \{\n\tredir https://www\.theleadflowpro\.com\{uri\} 308\n\}")
        self.assertNotIn("vercel", self.code(self.site).lower())

    def test_website_block_answers_directory_errors_with_the_directory_headers(self):
        www = re.search(r"(?ms)^www\.theleadflowpro\.com \{\n(.*?)^\}", self.site).group(1)
        errors_block = re.search(r"(?ms)^\thandle_errors \{\n(.*?)^\t\}", www).group(1)
        lines = [l.strip() for l in errors_block.splitlines() if l.strip() and not l.strip().startswith("#")]
        # The directory's error answers first (a glob: a no-op until installed),
        # then a plain fallback for every other error.
        self.assertEqual(lines[0], "import /etc/caddy/longview-archive/*.errors")
        self.assertEqual(lines[1:], ["handle {", 'respond "{err.status_code} {err.status_text}" {err.status_code}', "}"])

    def test_errors_fragment_is_self_contained_and_matches_the_routes(self):
        errors = ERRORS.read_text()
        code = self.code(errors)
        self.assertNotRegex(code, r"(?m)^\s*import\b", "no snippet from another file")
        self.assertIn("@longview_archive_directory_error path /longview/businesses /longview/businesses/*", code)
        self.assertEqual(len(re.findall(r"(?m)^[^\s}]", code)), 2)
        self.assertRegex(code, r"(?m)^handle @longview_archive_directory_error \{$")
        self.assertIn('respond "{err.status_code}" {err.status_code}', code)
        # The very same header block as the routes (noindex and the directory policy).
        header = re.compile(r"\n\theader \{\n(.*?)\n\t\}", re.S)
        self.assertEqual(header.search(errors).group(1), header.search(self.routes).group(1))
        self.assertIn('X-Robots-Tag "noindex, nofollow, noarchive, nosnippet"', errors)
        for word in ("status.json", "reverse_proxy", "file_server", "vercel", "supabase"):
            self.assertNotIn(word, code.lower())
        for number, line in enumerate(errors.splitlines(), 1):
            with self.subTest(line=number):
                self.assertFalse(line.startswith(" "), "indent with tabs")

    def test_droplet_installer_refreshes_the_site_block_safely(self):
        text = DROPLET_INSTALL.read_text()
        self.assertIn('cmp -s "$APP_DIR/deploy/droplet/theleadflowpro.caddy" "$SITE_BLOCK"', text)
        refresh = text.index('elif ! cmp -s "$APP_DIR/deploy/droplet/theleadflowpro.caddy"')
        # One backup, outside sites/ (so Caddy never loads it), removed once Caddy took the new block.
        self.assertIn("SITE_BACKUP=/etc/caddy/theleadflowpro.caddy.previous\n", text)
        validate = text.index("caddy validate --config /etc/caddy/Caddyfile", refresh)
        restore = text.index('install -m 644 "$SITE_BACKUP" "$SITE_BLOCK"', validate)
        reload_at = text.index("if ! systemctl reload caddy; then", validate)
        self.assertLess(restore, reload_at)
        # A failed reload puts the block back too, and only then the backup goes.
        restore_after_reload = text.index('install -m 644 "$SITE_BACKUP" "$SITE_BLOCK"', reload_at)
        cleanup = text.index('rm -f "$SITE_BACKUP"', reload_at)
        self.assertLess(restore_after_reload, cleanup)
        self.assertNotIn("theleadflowpro.caddy.bak.", text)
        proc = subprocess.run([BASH, "-n", str(DROPLET_INSTALL)], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)

    def test_droplet_installer_refresh_runs(self):
        # The refresh section of deploy/droplet/install.sh, run against a
        # temporary /etc/caddy with fake caddy and systemctl.
        text = DROPLET_INSTALL.read_text()
        start = text.index("SITE_BLOCK=/etc/caddy/sites/theleadflowpro.caddy\n")
        end = text.index('ok "Caddy config valid and reloaded', start)
        end = text.index("\n", end) + 1
        section = text[start:end]
        new_block = WEBSITE_CADDY.read_text()
        cases = (
            # (validate ok, reload ok) -> the new block stays; the backup is gone
            ("ok", True, True, new_block, 0),
            ("validate fails", False, True, "old\n", 1),
            ("reload fails", True, False, "old\n", 1),
        )
        for label, validate_ok, reload_ok, want, code in cases:
            with self.subTest(case=label), tempfile.TemporaryDirectory() as tmp:
                etc = Path(tmp) / "etc" / "caddy"
                (etc / "sites").mkdir(parents=True)
                (etc / "sites" / "theleadflowpro.caddy").write_text("old\n")
                app = Path(tmp) / "app"
                (app / "deploy" / "droplet").mkdir(parents=True)
                (app / "deploy" / "droplet" / "theleadflowpro.caddy").write_text(new_block)
                body = section.replace("/etc/caddy", str(etc))
                script = (
                    "set -euo pipefail\n"
                    f'APP_DIR="{app}"\n'
                    "ok() { :; }\n"
                    "die() { echo \"$*\" >&2; exit 1; }\n"
                    f"caddy() {{ {'true' if validate_ok else 'false'}; }}\n"
                    f"systemctl() {{ case $1 in reload) {'true' if reload_ok else 'false'} ;; esac; }}\n"
                    + body
                )
                proc = subprocess.run([BASH, "-c", script], capture_output=True, text=True, timeout=60)
                self.assertEqual(proc.returncode, code, proc.stdout + proc.stderr)
                self.assertEqual((etc / "sites" / "theleadflowpro.caddy").read_text(), want)
                self.assertFalse((etc / "theleadflowpro.caddy.previous").exists() and code == 0)
                self.assertEqual(sorted(p.name for p in (etc / "sites").iterdir()), ["theleadflowpro.caddy"])

    def test_public_host_template(self):
        self.assertRegex(self.template, r"(?m)^@PUBLIC_HOST@ \{$")
        self.assertIn("\timport /etc/caddy/longview-archive/website.routes\n", self.template)
        self.assertIn("\timport longview_archive_headers\n", self.template)
        self.assertIn("@longview_public_not_directory not path /longview/businesses /longview/businesses/*",
                      self.template)
        self.assertIn("import longview_archive_csp_strict @longview_public_not_directory", self.template)
        self.assertIn("Disallow: /", self.template)
        self.assertIn("handle_errors", self.template)
        self.assertNotRegex(self.code(self.template), r"/status|@status")
        self.assertTrue(self.template.startswith("\n"), "appended after the staging file")

    # -- real Caddy, when it is installed -------------------------------------

    def caddy(self):
        caddy = shutil.which("caddy")
        if not caddy:
            self.skipTest("caddy not installed")
        return caddy

    def validate(self, caddy, tmp, text):
        caddyfile = Path(tmp) / "Caddyfile"
        caddyfile.write_text(text)
        return subprocess.run(
            [caddy, "validate", "--config", str(caddyfile), "--adapter", "caddyfile"],
            capture_output=True, text=True, timeout=60,
            env={**os.environ, "HOME": tmp, "XDG_DATA_HOME": tmp, "XDG_CONFIG_HOME": tmp},
        )

    def test_caddy_accepts_the_website_with_and_without_the_routes(self):
        caddy = self.caddy()
        with tempfile.TemporaryDirectory() as tmp:
            routes_dir = Path(tmp) / "longview-archive"
            site = self.site.replace("/etc/caddy/longview-archive", str(routes_dir))
            (Path(tmp) / "site.caddy").write_text(site)
            proc = self.validate(caddy, tmp, f"import {tmp}/site.caddy\n")
            self.assertEqual(proc.returncode, 0, "no routes installed: " + proc.stdout + proc.stderr)
            routes_dir.mkdir()
            shutil.copy(ROUTES, routes_dir / "website.routes")
            shutil.copy(ERRORS, routes_dir / "website.errors")
            proc = self.validate(caddy, tmp, f"import {tmp}/site.caddy\n")
            self.assertEqual(proc.returncode, 0, "routes installed: " + proc.stdout + proc.stderr)

    def test_caddy_accepts_the_staging_file_with_the_public_host(self):
        caddy = self.caddy()
        with tempfile.TemporaryDirectory() as tmp:
            routes = Path(tmp) / "website.routes"
            shutil.copy(ROUTES, routes)
            text = CADDY.read_text() + self.template.replace("@PUBLIC_HOST@", PUBLIC_HOST)
            text = text.replace("/etc/caddy/longview-archive/website.routes", str(routes))
            (Path(tmp) / "site.caddy").write_text(text)
            # With the LeadFlow site block too, as on the droplet after cutover.
            site = self.site.replace("/etc/caddy/longview-archive/*.routes", f"{tmp}/*.routes")
            (Path(tmp) / "leadflow.caddy").write_text(site)
            proc = self.validate(caddy, tmp, f"import {tmp}/site.caddy\nimport {tmp}/leadflow.caddy\n")
            self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)

    def test_caddy_serves_the_directory_on_the_website_and_the_rest_from_the_app(self):
        caddy = self.caddy()
        import http.server
        import threading

        class App(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                body = f"app {self.path}".encode()
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass

        app = http.server.ThreadingHTTPServer(("127.0.0.1", 0), App)
        threading.Thread(target=app.serve_forever, daemon=True).start()
        self.addCleanup(app.server_close)
        self.addCleanup(app.shutdown)
        with tempfile.TemporaryDirectory() as tmp:
            www = Path(tmp) / "www"
            build = www / "longview" / ".builds" / "b1"
            (build / "about").mkdir(parents=True)
            (build / "index.html").write_text("<h1>directory</h1>")
            (build / "about" / "index.html").write_text("<h1>about</h1>")
            (build / "search.js").write_text("/* js */")
            (www / "longview" / "businesses").symlink_to(Path(".builds") / "b1")
            (www / "status").mkdir()
            (www / "status" / "index.html").write_text("<h1>status</h1>")
            (www / "status.json").write_text("{}")
            routes_dir = Path(tmp) / "routes"
            routes_dir.mkdir()
            # boom.html stands in for an error raised inside file_server (a file
            # swapped away mid-request, a file Caddy may not read).
            (build / "boom.html").write_text("never served")
            routes = self.routes.replace("/var/lib/longview-archive/www", str(www))
            self.assertEqual(routes.count("\n\t\tfile_server\n"), 1)
            routes = routes.replace(
                "\n\t\tfile_server\n",
                '\n\t\t@lva_test_boom path /longview/businesses/boom.html\n'
                '\t\terror @lva_test_boom "simulated" 403\n\t\tfile_server\n')
            (routes_dir / "website.routes").write_text(routes)
            shutil.copy(ERRORS, routes_dir / "website.errors")
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                port = sock.getsockname()[1]
            site = self.site.split("\nwww.theleadflowpro.com {", 1)[1]
            site = f"http://127.0.0.1:{port} {{" + site
            site = site.replace("/etc/caddy/longview-archive", str(routes_dir))
            site = site.replace("127.0.0.1:3100", f"127.0.0.1:{app.server_address[1]}")
            caddyfile = Path(tmp) / "Caddyfile"
            caddyfile.write_text("{\n\tadmin off\n}\n\n" + site)
            env = {**os.environ, "HOME": tmp, "XDG_DATA_HOME": tmp, "XDG_CONFIG_HOME": tmp}
            proc = subprocess.Popen([caddy, "run", "--config", str(caddyfile), "--adapter", "caddyfile"],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
            try:
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

                def get(path):
                    deadline = time.monotonic() + 15
                    while True:
                        try:
                            resp = opener.open(f"http://127.0.0.1:{port}{path}", timeout=5)
                            return resp.status, resp.headers, resp.read().decode()
                        except urllib.error.HTTPError as exc:
                            return exc.code, exc.headers, exc.read().decode()
                        except OSError:
                            if time.monotonic() > deadline:
                                raise
                            time.sleep(0.2)

                status, headers, _ = get("/longview/businesses")
                self.assertEqual((status, headers["Location"]), (308, "/longview/businesses/"))
                for path, body in (("/longview/businesses/", "directory"), ("/longview/businesses/about", "about"),
                                   ("/longview/businesses/about/", "about"),
                                   ("/longview/businesses/search.js", "js")):
                    with self.subTest(path=path):
                        status, headers, text = get(path)
                        self.assertEqual(status, 200)
                        self.assertIn(body, text)
                        self.assertEqual(headers["Content-Security-Policy"], DIRECTORY_CSP)
                        self.assertEqual(headers["X-Robots-Tag"], "noindex, nofollow, noarchive, nosnippet")
                        self.assertEqual(headers["X-Frame-Options"], "DENY")
                        self.assertEqual(headers["Cache-Control"], "no-store")
                        self.assertIsNone(headers["Server"])
                status, headers, _ = get("/longview/businesses/missing/")
                self.assertEqual(status, 404)
                self.assertEqual(headers["Content-Security-Policy"], DIRECTORY_CSP)
                self.assertIn("noindex", headers["X-Robots-Tag"])
                # Everything else, the status files and the rest of /longview
                # included, is the app's.
                for path in ("/", "/longview", "/longview/", "/longview/businesses-old", "/status.json",
                             "/status/", "/longview/.builds/b1/"):
                    with self.subTest(path=path):
                        status, headers, text = get(path)
                        self.assertEqual((status, text), (200, f"app {path}"))
                        self.assertIsNone(headers["X-Robots-Tag"])
                        self.assertIsNone(headers["Content-Security-Policy"])
                # An error inside file_server still says noindex, with the
                # directory's policy (website.errors, through handle_errors).
                status, headers, text = get("/longview/businesses/boom.html")
                self.assertEqual((status, text), (403, "403"))
                self.assertEqual(headers["Content-Security-Policy"], DIRECTORY_CSP)
                self.assertEqual(headers["X-Robots-Tag"], "noindex, nofollow, noarchive, nosnippet")
                self.assertIsNone(headers["Server"])
                # The app not answering is a plain error, without the directory's headers.
                app.shutdown()
                app.server_close()
                status, headers, text = get("/pricing")
                self.assertEqual((status, text), (502, "502 Bad Gateway"))
                self.assertIsNone(headers["X-Robots-Tag"])
                self.assertIsNone(headers["Content-Security-Policy"])
            finally:
                proc.terminate()
                proc.wait(timeout=30)


class EnvFileTest(unittest.TestCase):
    """/etc/longview-archive/env: one optional file the service and the lva command line share."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="lva-env-test-"))
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.path = self.tmp / "env"

    def test_default_path(self):
        self.assertEqual(config.ENV_FILE, Path("/etc/longview-archive/env"))

    def test_missing_file_is_fine(self):
        self.assertEqual(config.read_env_file(self.tmp / "absent"), {})
        self.assertEqual(config.environment({"LVA_X": "1"}, self.tmp / "absent"), {"LVA_X": "1"})

    def test_only_the_address_keys_and_never_other_variables(self):
        self.assertEqual(config.ENV_FILE_KEYS, {"LVA_PUBLIC_BASE_URL", "LVA_PUBLIC_HOST"})
        self.path.write_text(
            "# comment\n\n"
            "LVA_PUBLIC_BASE_URL=https://longview.theleadflowpro.com\n"
            'export LVA_PUBLIC_HOST="longview.theleadflowpro.com"\n'
            "PATH=/tmp/evil\n"
            "PYTHONPATH=/tmp/evil\n"
            "lva_lower=1\n"
            "LD_PRELOAD=/tmp/evil.so\n"
            "not a line\n"
        )
        self.assertEqual(
            config.read_env_file(self.path),
            {
                "LVA_PUBLIC_BASE_URL": "https://longview.theleadflowpro.com",
                "LVA_PUBLIC_HOST": "longview.theleadflowpro.com",
            },
        )

    def test_other_lva_keys_are_refused(self):
        # Crawl limits, the indexing switch, the user agent, endpoints, paths,
        # and the test-only escape hatches never come from this file.
        for key, value in (
            ("LVA_ALLOW_PRIVATE_HOSTS", "1"),
            ("LVA_MIN_HOST_DELAY", "0"),
            ("LVA_MAX_SITES", "50"),
            ("LVA_INDEXABLE", "1"),
            ("LVA_USER_AGENT", "Mozilla/5.0"),
            ("LVA_SOCRATA_BASE", "https://example.invalid"),
            ("LVA_DATA_DIR", "/tmp"),
        ):
            with self.subTest(key=key):
                self.path.write_text(f"LVA_PUBLIC_BASE_URL=https://longview.theleadflowpro.com\n{key}={value}\n")
                with self.assertRaisesRegex(ValueError, f"line 2: {key} cannot be set there"):
                    config.load_settings(config.environment({}, self.path))
        # The same variables from the real environment (tests, the unit) still work.
        settings = config.load_settings(config.environment(
            {"LVA_DATA_DIR": str(self.tmp), "LVA_MIN_HOST_DELAY": "30"}, self.tmp / "absent"))
        self.assertEqual(settings.min_host_delay_s, 30.0)
        self.assertFalse(settings.allow_private_hosts)

    def test_values_quotes_and_inline_comments(self):
        for line, want in (
            ("LVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com  # main site", "https://www.theleadflowpro.com"),
            ("LVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com\t# main", "https://www.theleadflowpro.com"),
            ('LVA_PUBLIC_BASE_URL="https://www.theleadflowpro.com" # main', "https://www.theleadflowpro.com"),
            ("LVA_PUBLIC_BASE_URL='https://www.theleadflowpro.com'", "https://www.theleadflowpro.com"),
            ("  LVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com   ", "https://www.theleadflowpro.com"),
        ):
            with self.subTest(line=line):
                self.path.write_text(line + "\n")
                self.assertEqual(config.read_env_file(self.path), {"LVA_PUBLIC_BASE_URL": want})
                settings = config.load_settings(config.environment({"LVA_DATA_DIR": str(self.tmp)}, self.path))
                self.assertEqual(settings.public_base_url, want)
        for line in ("LVA_PUBLIC_HOST='open", 'LVA_PUBLIC_HOST="a" b'):
            with self.subTest(line=line):
                self.path.write_text(line + "\n")
                with self.assertRaises(ValueError):
                    config.read_env_file(self.path)

    def test_installer_reads_the_file_with_the_same_parser(self):
        # install.sh's env_file_value runs config.read_env_file, so the two agree.
        code = INSTALL.read_text()
        body = code[code.index("env_file_value() {"):code.index("\n}\n", code.index("env_file_value() {"))]
        self.assertIn("config.read_env_file(", body)
        self.path.write_text("LVA_PUBLIC_BASE_URL=https://www.theleadflowpro.com  # main site\n")
        script = body.split("\n", 1)[1]
        proc = subprocess.run(
            [BASH, "-c", f'set -euo pipefail\nLVA_ENV_FILE="$1"; SOURCE_DIR="$2"\nf() {{\n{script}\n}}\nf LVA_PUBLIC_BASE_URL',
             "-", str(self.path), str(ROOT)],
            capture_output=True, text=True, timeout=60,
        )
        self.assertEqual((proc.returncode, proc.stdout), (0, "https://www.theleadflowpro.com\n"), proc.stderr)

    def test_real_environment_wins(self):
        self.path.write_text("LVA_PUBLIC_BASE_URL=https://longview.theleadflowpro.com\n")
        merged = config.environment({"LVA_PUBLIC_BASE_URL": "https://www.theleadflowpro.com",
                                     "LVA_MAX_PAGES": "6"}, self.path)
        self.assertEqual(merged["LVA_PUBLIC_BASE_URL"], "https://www.theleadflowpro.com")
        self.assertEqual(merged["LVA_MAX_PAGES"], "6")
        settings = config.load_settings(config.environment({"LVA_DATA_DIR": str(self.tmp)}, self.path))
        self.assertEqual(settings.public_base_url, "https://longview.theleadflowpro.com")
        self.assertIn("https://longview.theleadflowpro.com/longview/businesses/about/", settings.user_agent)

    def test_bad_value_in_the_file_is_a_settings_problem(self):
        self.path.write_text("LVA_PUBLIC_BASE_URL=http://insecure.example/path\n")
        with self.assertRaises(ValueError):
            config.load_settings(config.environment({}, self.path))

    def test_command_line_and_service_read_the_file(self):
        # systemd's `run` and every lva command go through main().
        from longview_archive import __main__ as cli
        from unittest import mock

        self.path.write_text("LVA_PUBLIC_BASE_URL=https://longview.theleadflowpro.com\n")
        seen = {}

        def fake_load(env=None):
            seen.update(env or {})
            raise ValueError("stop here")

        with mock.patch.object(config, "ENV_FILE", self.path), \
                mock.patch.object(cli.config, "load_settings", side_effect=fake_load), \
                mock.patch.dict(os.environ, {"LVA_MAX_PAGES": "6"}):
            code = cli.main(["check"])
        self.assertEqual(code, 1)
        self.assertEqual(seen.get("LVA_PUBLIC_BASE_URL"), "https://longview.theleadflowpro.com")
        self.assertEqual(seen.get("LVA_MAX_PAGES"), "6")

    def test_unit_needs_no_environment_file(self):
        # The engine reads the file itself; the unit's sandbox keeps /etc readable.
        unit = parse_unit(UNIT.read_text())["Service"]
        self.assertNotIn("EnvironmentFile", unit)
        self.assertEqual(unit["ProtectSystem"], ["strict"])
        self.assertIn("/etc/longview-archive/env", UNIT.read_text())


class PreflightRunTest(unittest.TestCase):
    def test_runs_read_only_and_summarizes(self):
        # Read-only by design, so it runs against this machine as it is. It
        # exits 1 here because this is not the droplet.
        proc = subprocess.run(
            [BASH, str(PREFLIGHT)], capture_output=True, text=True, timeout=120,
        )
        self.assertIn(proc.returncode, (0, 1), proc.stdout + proc.stderr)
        self.assertIn("== Summary", proc.stdout)
        self.assertRegex(proc.stdout, r"\d+ PASS, \d+ WARN")
        for needle in ("unbound variable", "syntax error", "No such file or directory: /etc/pda"):
            self.assertNotIn(needle, proc.stderr)


if __name__ == "__main__":
    unittest.main()
