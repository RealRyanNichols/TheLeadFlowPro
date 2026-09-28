#!/usr/bin/env python3
"""DO-local campaign ledger. No networking unless `run --send` or `serve`.

The SQLite file is an automation ledger, not a second CRM. Only an authorized
local operator can import verified consent or pause an enrollment. No HTTP
enrollment/admin endpoint exists. Python 3.11+, standard library only.
"""
import argparse
import base64
import contextlib
import hashlib
import hmac
import html
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

UTC = timezone.utc
CENTRAL = ZoneInfo("America/Chicago")
DAY = 86400
RETRY_WINDOW = 23 * 3600
MAX_BODY = 262144


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def email_address(value):
    value = str(value).strip().lower()
    if len(value) > 254 or not re.fullmatch(r"[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+", value):
        raise ValueError("Invalid email address")
    if "@no-email." in value:
        raise ValueError("Sentinel addresses cannot enroll")
    return value


def timestamp(value):
    dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        raise ValueError("Timestamps must include a timezone")
    return dt.timestamp()


def next_slot(not_before):
    """First instant in the Chicago 10am hour at/after the 24h boundary."""
    local = datetime.fromtimestamp(not_before, CENTRAL)
    candidate = local.replace(hour=10, minute=0, second=0, microsecond=0)
    if local.hour == 10:
        return not_before
    if candidate.timestamp() < not_before:
        candidate = candidate + timedelta(days=1)
    return candidate.timestamp()


SCHEMA = """
CREATE TABLE IF NOT EXISTS enrollments (
 id TEXT PRIMARY KEY, source TEXT NOT NULL, source_lead_id TEXT NOT NULL,
 sequence_id TEXT NOT NULL, version TEXT NOT NULL, sequence_json TEXT NOT NULL,
 sequence_hash TEXT NOT NULL, email TEXT NOT NULL, first_name TEXT NOT NULL,
 consent_json TEXT NOT NULL, consent_hash TEXT NOT NULL, enrolled_at REAL NOT NULL,
 state TEXT NOT NULL DEFAULT 'active', pause_reason TEXT,
 next_day INTEGER NOT NULL DEFAULT 1, next_due REAL NOT NULL,
 last_accepted_at REAL,
 UNIQUE(source, source_lead_id, sequence_id, version),
 UNIQUE(email, sequence_id, version), CHECK(next_day BETWEEN 1 AND 31)
);
CREATE TABLE IF NOT EXISTS deliveries (
 id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL REFERENCES enrollments(id),
 day INTEGER NOT NULL CHECK(day BETWEEN 1 AND 30), payload TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE, state TEXT NOT NULL DEFAULT 'pending',
 first_attempt REAL NOT NULL, last_attempt REAL, attempts INTEGER NOT NULL DEFAULT 0,
 lease_until REAL, claim_token TEXT, accepted_at REAL, provider_id TEXT,
 error_code TEXT, UNIQUE(enrollment_id, day)
);
CREATE TABLE IF NOT EXISTS suppressions (
 email TEXT PRIMARY KEY, reason TEXT NOT NULL, recorded_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS provider_events (
 event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, body_hash TEXT NOT NULL,
 received_at REAL NOT NULL, provider_id TEXT
);
CREATE TABLE IF NOT EXISTS audit (
 id INTEGER PRIMARY KEY, at REAL NOT NULL, action TEXT NOT NULL,
 enrollment_id TEXT, detail TEXT NOT NULL
);
"""


class Ledger:
    def __init__(self, config):
        self.config = config
        path = Path(config["db_path"])
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.db = sqlite3.connect(path, timeout=20, isolation_level=None)
        os.chmod(path, 0o600)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.executescript(SCHEMA)

    @contextlib.contextmanager
    def transaction(self):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield
            self.db.execute("COMMIT")
        except BaseException:
            self.db.execute("ROLLBACK")
            raise

    def audit(self, action, enrollment_id, detail, now):
        self.db.execute("INSERT INTO audit(at,action,enrollment_id,detail) VALUES(?,?,?,?)",
                        (now, action, enrollment_id, detail))

    def import_consent(self, record, sequence, now=None):
        now = time.time() if now is None else now
        validate_sequence(sequence)
        consent = record["consent"]
        if consent.get("granted") is not True or consent.get("channel") != "email":
            raise ValueError("Explicit email consent is required")
        if consent.get("daily_for_30_days") is not True:
            raise ValueError("Consent must explicitly cover daily emails for 30 days")
        expected_notice = self.config.get("consent_notice")
        if not expected_notice or consent.get("notice_text") != expected_notice:
            raise ValueError("Consent notice does not match the reviewed notice")
        if not consent.get("evidence_id") or not consent.get("notice_version"):
            raise ValueError("Consent evidence id and notice version are required")
        if record.get("source") not in self.config.get("allowed_sources", []):
            raise ValueError("Source is not allowlisted")
        if str(consent.get("form_id", "")) not in self.config.get("allowed_form_ids", []):
            raise ValueError("Consent form is not allowlisted")
        if not str(record.get("source_lead_id", "")).strip():
            raise ValueError("Immutable source lead id is required")
        granted_at = timestamp(consent["granted_at"])
        start = self.config.get("campaign_start_at")
        if not start or granted_at < timestamp(start) or granted_at > now + 60:
            raise ValueError("Consent is outside the reviewed campaign window")
        email = email_address(record["email"])
        first = str(record.get("first_name", "there")).strip()[:80] or "there"
        consent_text = canonical(consent)
        seq_text = canonical(sequence)
        with self.transaction():
            old = self.db.execute("SELECT * FROM enrollments WHERE source=? AND source_lead_id=? AND sequence_id=? AND version=?",
                                  (record["source"], str(record["source_lead_id"]), sequence["sequence_id"], sequence["version"])).fetchone()
            if old:
                if old["email"] != email or old["consent_hash"] != digest(consent_text) or old["sequence_hash"] != digest(seq_text):
                    raise ValueError("Existing enrollment is immutable; review conflicting import")
                return old["id"]
            if self.db.execute("SELECT 1 FROM suppressions WHERE email=?", (email,)).fetchone():
                raise ValueError("Address is suppressed; import cannot restore consent")
            enrollment_id = str(uuid.uuid4())
            self.db.execute("""INSERT INTO enrollments
             (id,source,source_lead_id,sequence_id,version,sequence_json,sequence_hash,email,
              first_name,consent_json,consent_hash,enrolled_at,next_due)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
             (enrollment_id,record["source"],str(record["source_lead_id"]),sequence["sequence_id"],
              sequence["version"],seq_text,digest(seq_text),email,first,consent_text,digest(consent_text),now,next_slot(now+DAY)))
            self.audit("enrolled", enrollment_id, "explicit consent recorded", now)
        return enrollment_id

    def suppress(self, email, reason, now=None):
        now = time.time() if now is None else now
        email = email_address(email)
        with self.transaction():
            self._suppress(email, reason, now)

    def _suppress(self, email, reason, now):
        self.db.execute("INSERT OR IGNORE INTO suppressions VALUES(?,?,?)", (email, reason, now))
        self.db.execute("UPDATE enrollments SET state='suppressed',pause_reason=? WHERE email=?", (reason,email))
        self.audit("suppressed", None, reason, now)

    def pause(self, enrollment_id, reason, now=None):
        if reason not in {"reply", "booking", "purchase", "operator_review", "consent_withdrawn"}:
            raise ValueError("Unsupported pause reason")
        now = time.time() if now is None else now
        with self.transaction():
            row = self.db.execute("SELECT * FROM enrollments WHERE id=?", (enrollment_id,)).fetchone()
            if not row:
                raise ValueError("Unknown enrollment")
            if reason == "consent_withdrawn":
                self._suppress(row["email"], reason, now)
            else:
                self.db.execute("UPDATE enrollments SET state='paused',pause_reason=? WHERE id=? AND state='active'", (reason,enrollment_id))
                self.audit("paused", enrollment_id, reason, now)

    def status(self):
        return {
            "enrollments": {r[0]: r[1] for r in self.db.execute("SELECT state,count(*) FROM enrollments GROUP BY state")},
            "deliveries": {r[0]: r[1] for r in self.db.execute("SELECT state,count(*) FROM deliveries GROUP BY state")},
            "suppressions": self.db.execute("SELECT count(*) FROM suppressions").fetchone()[0],
        }

    def claim(self, enrollment_id, now=None):
        now = time.time() if now is None else now
        with self.transaction():
            e = self.db.execute("SELECT * FROM enrollments WHERE id=?", (enrollment_id,)).fetchone()
            if not e or e["state"] != "active" or e["next_day"] > 30:
                return None
            if self.db.execute("SELECT 1 FROM suppressions WHERE email=?", (e["email"],)).fetchone():
                return None
            d = self.db.execute("SELECT * FROM deliveries WHERE enrollment_id=? AND day=?", (e["id"],e["next_day"])).fetchone()
            if d:
                if d["state"] != "pending" or (d["lease_until"] or 0) > now:
                    return None
                if now-d["first_attempt"] >= RETRY_WINDOW:
                    self.db.execute("UPDATE deliveries SET state='review',error_code='idempotency_window_expired' WHERE id=?",(d["id"],))
                    self.db.execute("UPDATE enrollments SET state='paused',pause_reason='ambiguous_delivery_review' WHERE id=?",(e["id"],))
                    return None
                if d["last_attempt"] is not None and now-d["last_attempt"] < 1800:
                    return None
            else:
                local = datetime.fromtimestamp(now,CENTRAL)
                # New steps only during 10:00–10:59 Chicago. Missed runs wait;
                # pending SAME-step retries may run later inside the safe window.
                if e["next_due"] > now or local.hour != 10:
                    return None
                if e["last_accepted_at"] is not None and now-e["last_accepted_at"] < DAY:
                    return None
                payload = render_payload(dict(e), self.config)
                delivery_id = str(uuid.uuid4())
                key = "lfp-" + digest(f"{e['sequence_id']}:{e['version']}:{e['id']}:{e['next_day']}")
                self.db.execute("INSERT INTO deliveries(id,enrollment_id,day,payload,idempotency_key,first_attempt) VALUES(?,?,?,?,?,?)",
                                (delivery_id,e["id"],e["next_day"],canonical(payload),key,now))
                d = self.db.execute("SELECT * FROM deliveries WHERE id=?",(delivery_id,)).fetchone()
            token = str(uuid.uuid4())
            self.db.execute("UPDATE deliveries SET claim_token=?,lease_until=?,last_attempt=?,attempts=attempts+1 WHERE id=?",
                            (token,now+120,now,d["id"]))
            return dict(self.db.execute("SELECT * FROM deliveries WHERE id=?",(d["id"],)).fetchone())

    def dispatch(self, claim, transport, now=None):
        """Recheck under a write lock through the <=10s provider attempt.

        Pause/unsubscribe committed before this lock wins. Once sending starts,
        an in-flight provider request cannot be recalled. Each request has the
        SAME payload and key. Crash/unknown response leaves a durable claim.
        """
        real_clock = now is None
        now = time.time() if real_clock else now
        with self.transaction():
            d = self.db.execute("SELECT * FROM deliveries WHERE id=?",(claim["id"],)).fetchone()
            e = self.db.execute("SELECT * FROM enrollments WHERE id=?",(claim["enrollment_id"],)).fetchone()
            if not d or d["claim_token"] != claim["claim_token"] or d["state"] != "pending" or d["lease_until"] <= now:
                return False
            if e["state"] != "active" or self.db.execute("SELECT 1 FROM suppressions WHERE email=?",(e["email"],)).fetchone():
                self.db.execute("UPDATE deliveries SET lease_until=NULL,claim_token=NULL WHERE id=?",(d["id"],))
                return False
            if now-d["first_attempt"] >= RETRY_WINDOW:
                return False
            result, provider_id = transport(d["payload"], d["idempotency_key"])
            finished = time.time() if real_clock else now
            if result == "accepted":
                self.db.execute("UPDATE deliveries SET state='accepted',accepted_at=?,provider_id=?,lease_until=NULL,claim_token=NULL,error_code=NULL WHERE id=?", (finished,provider_id,d["id"]))
                state = "completed" if d["day"] == 30 else "active"
                self.db.execute("UPDATE enrollments SET next_day=?,last_accepted_at=?,next_due=?,state=? WHERE id=?",
                                (d["day"]+1,finished,next_slot(finished+DAY),state,e["id"]))
                self.audit("provider_accepted",e["id"],f"day={d['day']}",finished)
                return True
            state = "review" if result == "rejected" else "pending"
            self.db.execute("UPDATE deliveries SET state=?,lease_until=NULL,claim_token=NULL,error_code=? WHERE id=?",(state,result,d["id"]))
            if state == "review":
                self.db.execute("UPDATE enrollments SET state='paused',pause_reason='provider_rejection_review' WHERE id=?",(e["id"],))
            return False

    def provider_event(self, event_id, raw, now=None):
        """Caller MUST verify Svix on the raw bytes before calling."""
        now = time.time() if now is None else now
        event = json.loads(raw)
        kind, data = event.get("type"), event.get("data", {})
        if not isinstance(data,dict) or not isinstance(kind,str):
            raise ValueError("Invalid event")
        with self.transaction():
            inserted = self.db.execute("INSERT OR IGNORE INTO provider_events VALUES(?,?,?,?,?)",(event_id,kind,hashlib.sha256(raw).hexdigest(),now,data.get("email_id"))).rowcount
            if not inserted:
                return False
            addresses = data.get("to", [])
            if isinstance(addresses,str):
                addresses = [addresses]
            if kind in {"suppression.added","contact.updated"}:
                addresses = [data.get("email", "")]
            suppress = kind in {"email.bounced","email.complained","email.suppressed","suppression.added"} or (kind == "contact.updated" and data.get("unsubscribed") is True)
            if suppress:
                for address in addresses:
                    try:
                        address = email_address(address)
                    except ValueError:
                        continue
                    # The provider account may be shared; only this ledger's
                    # addresses are relevant. Never save arbitrary recipients.
                    if self.db.execute("SELECT 1 FROM enrollments WHERE email=?",(address,)).fetchone():
                        self._suppress(address,kind,now)
            # Never auto-resume on suppression.removed or contact resubscribe.
            return True


def validate_sequence(sequence):
    if sequence.get("timezone") != "America/Chicago" or not sequence.get("sequence_id") or not sequence.get("version"):
        raise ValueError("Sequence identity, version and Chicago timezone required")
    emails = sequence.get("emails", [])
    if [x.get("day") for x in emails] != list(range(1,31)):
        raise ValueError("Sequence must contain ordered days 1 through 30")
    for item in emails:
        if not item.get("subject") or not isinstance(item.get("body"),list) or not all(isinstance(x,str) for x in item["body"]):
            raise ValueError("Invalid email template")


def secret(name):
    value = os.environ.get(name, "")
    if len(value) < 32:
        raise ValueError(f"{name} must be configured privately (minimum 32 characters)")
    return value


def unsubscribe_token(enrollment_id):
    return hmac.new(secret("LFP_EMAIL_UNSUBSCRIBE_SECRET").encode(),("unsub:"+enrollment_id).encode(),hashlib.sha256).hexdigest()


def token_valid(enrollment_id, token):
    return bool(enrollment_id and token) and hmac.compare_digest(unsubscribe_token(enrollment_id),token)


def render_payload(enrollment, config, preview=False):
    seq = json.loads(enrollment["sequence_json"])
    item = seq["emails"][enrollment["next_day"]-1]
    unsub = ("https://example.invalid/preview-only" if preview else
             config["public_base_url"].rstrip("/")+"/unsubscribe?"+urlencode({"id":enrollment["id"],"t":unsubscribe_token(enrollment["id"])}) )
    paragraphs = [x.replace("{{first_name}}",enrollment["first_name"]) for x in item["body"]]
    body_paragraphs = list(paragraphs)
    cta = item.get("cta") or {}
    if cta:
        if urlparse(cta["url"]).scheme not in {"https","mailto"}:
            raise ValueError("CTA must use HTTPS or mailto")
        paragraphs.append(f"{cta['label']}: {cta['url']}")
    footer = seq.get("footer",{})
    lines = [footer.get("business_name","The LeadFlow Pro"),footer.get("mailing_address") or "[MAILING ADDRESS REQUIRED]",
             "You asked for one business email a day for 30 days.","Unsubscribe: "+unsub]
    content = paragraphs + lines
    sender = seq["sender"]
    privacy = footer.get("privacy_url","https://www.theleadflowpro.com/privacy")
    if urlparse(privacy).scheme != "https":
        raise ValueError("Privacy URL must use HTTPS")
    # Contact links are verified business constants, never lead-provided URLs.
    phone = "+19035008898"
    content += ["Call Ryan: tel:"+phone,"Text Ryan: sms:"+phone,"Privacy: "+privacy]
    esc = lambda value: html.escape(str(value),quote=True)
    preheader = esc(item.get("preheader",""))
    body_html = "".join('<p style="margin:0 0 20px;line-height:1.65;">'+esc(p).replace("\n","<br>")+"</p>" for p in body_paragraphs)
    button = ('<p style="margin:28px 0;"><a style="display:inline-block;background:#164e63;color:#ffffff;'
              'padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:bold;" href="'+esc(cta["url"])
              +'">'+esc(cta["label"])+"</a></p>") if cta else ""
    html_body = (f'<!doctype html><html><body style="margin:0;background:#f1f5f9;color:#172b3a;font-family:Arial,sans-serif;">'
                 f'<div style="display:none;max-height:0;overflow:hidden;">{preheader}</div>'
                 '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">'
                 '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:white;border-radius:12px;">'
                 '<tr><td style="padding:28px 32px 18px;border-bottom:1px solid #e2e8f0;"><strong style="font-size:20px;">The LeadFlow Pro</strong>'
                 '<div style="font-size:13px;color:#526777;margin-top:6px;">A practical note from Ryan Nichols</div></td></tr>'
                 f'<tr><td style="padding:28px 32px;font-size:16px;">{body_html}{button}'
                 '<p style="font-size:14px;margin:24px 0 0;">Ryan Nichols<br>The LeadFlow Pro</p>'
                 f'<p style="font-size:14px;"><a href="tel:{phone}" style="color:#164e63;">Call Ryan</a> &nbsp;|&nbsp; '
                 f'<a href="sms:{phone}" style="color:#164e63;">Text Ryan</a></p></td></tr>'
                 '<tr><td style="padding:22px 32px;background:#eaf0f3;font-size:12px;line-height:1.6;color:#425766;">'
                 +"<br>".join(esc(x) for x in lines[:-1])
                 +f'<p><a href="{esc(unsub)}" style="color:#164e63;">Unsubscribe</a> &nbsp;|&nbsp; '
                 +f'<a href="{esc(privacy)}" style="color:#164e63;">Privacy</a></p></td></tr></table></td></tr></table></body></html>')
    return {"from":f"{sender['name']} <{email_address(sender['email'])}>","reply_to":email_address(sender["reply_to"]),
            "to":[enrollment["email"]],"subject":item["subject"],"text":"\n\n".join(content),
            "html":html_body,
            "headers":{"List-Unsubscribe":f"<{unsub}>","List-Unsubscribe-Post":"List-Unsubscribe=One-Click"},
            "tags":[{"name":"campaign","value":seq["sequence_id"]},{"name":"day","value":str(item["day"])},{"name":"version","value":seq["version"]}]}


def send_gaps(config, sequence):
    gaps = []
    for key in ["enabled","sender_verified","suppression_reconciled","webhook_ready"]:
        if config.get(key) is not True:
            gaps.append(key)
    if sequence.get("approved_for_sending") is not True:
        gaps.append("sequence approval")
    if config.get("approved_sequence_sha256") != digest(canonical(sequence)):
        gaps.append("approved sequence hash")
    if not sequence.get("footer",{}).get("mailing_address"):
        gaps.append("postal address")
    if not config.get("allowed_form_ids") or not config.get("consent_notice") or not config.get("campaign_start_at"):
        gaps.append("form and consent configuration")
    if not config.get("public_base_url", "").startswith("https://"):
        gaps.append("HTTPS public base URL")
    for name in ["RESEND_API_KEY","LFP_EMAIL_UNSUBSCRIBE_SECRET","RESEND_WEBHOOK_SECRET"]:
        if not os.environ.get(name):
            gaps.append(name)
    return gaps


def resend_transport(payload, key):
    request = Request("https://api.resend.com/emails",data=payload.encode(),method="POST",headers={
        "Authorization":"Bearer "+secret("RESEND_API_KEY"),"Content-Type":"application/json","Idempotency-Key":key,
        "User-Agent":"LeadFlow-DO-Email-Worker/1.0"})
    try:
        with urlopen(request,timeout=10) as response:
            raw = response.read(65536)
            try:
                provider_id = json.loads(raw).get("id")
            except (ValueError,AttributeError):
                provider_id = None
            if not isinstance(provider_id,str) or not provider_id.strip():
                return "ambiguous",None
            return "accepted",provider_id
    except HTTPError as error:
        return ("ambiguous" if error.code >= 500 or error.code in {408,409,429} else "rejected"),None
    except (URLError,TimeoutError,OSError):
        return "ambiguous",None


def verify_svix(raw, headers, signing_secret, now=None):
    now = time.time() if now is None else now
    try:
        event_id, stamp, signatures = headers["svix-id"],headers["svix-timestamp"],headers["svix-signature"]
        if not event_id or len(event_id)>256 or abs(now-int(stamp))>300:
            return False
        if not signing_secret.startswith("whsec_"):
            return False
        encoded = signing_secret[6:]
        key = base64.b64decode(encoded+"="*((-len(encoded))%4),validate=True)
        if len(key)<16:
            return False
        expected = base64.b64encode(hmac.new(key,f"{event_id}.{stamp}.".encode()+raw,hashlib.sha256).digest()).decode()
        return any(part.startswith("v1,") and hmac.compare_digest(expected,part[3:]) for part in signatures.split())
    except (KeyError,ValueError,TypeError):
        return False


def make_handler(config):
    base = urlparse(config["public_base_url"]).path.rstrip("/")
    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def log_message(self,*args):
            pass  # Never log unsubscribe tokens, request bodies or recipients.

        def reply(self,status,body,content_type="text/html; charset=utf-8"):
            self.send_response(status)
            self.send_header("Content-Type",content_type)
            self.send_header("Cache-Control","no-store")
            self.send_header("Referrer-Policy","no-referrer")
            self.send_header("Content-Security-Policy","default-src 'none'; form-action 'self'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(body.encode())

        def do_GET(self):
            self.handle_request(False)

        def do_POST(self):
            self.handle_request(True)

        def handle_request(self,post):
            db = None
            try:
                url = urlparse(self.path)
                if url.path not in {base+"/unsubscribe",base+"/resend-events"}:
                    return self.reply(404,"Not found")
                if url.path.endswith("/resend-events"):
                    if not post:
                        return self.reply(405,"POST required")
                    length = int(self.headers.get("Content-Length","0"))
                    if length<=0 or length>MAX_BODY:
                        return self.reply(413,"Invalid body size")
                    raw = self.rfile.read(length)
                    headers = {k.lower():v for k,v in self.headers.items()}
                    if not verify_svix(raw,headers,os.environ.get("RESEND_WEBHOOK_SECRET","")):
                        return self.reply(400,"Invalid signature")
                    db = Ledger(config)
                    db.provider_event(headers["svix-id"],raw)
                    return self.reply(200,'{"ok":true}',"application/json")
                params = parse_qs(url.query)
                enrollment_id = params.get("id",[""])[0]
                token = params.get("t",[""])[0]
                if not token_valid(enrollment_id,token):
                    return self.reply(403,"Invalid unsubscribe link")
                db = Ledger(config)
                e = db.db.execute("SELECT email FROM enrollments WHERE id=?",(enrollment_id,)).fetchone()
                if not e:
                    return self.reply(404,"Unknown unsubscribe link")
                if post:
                    db.suppress(e["email"],"unsubscribe")
                    return self.reply(200,"<h1>Unsubscribed</h1><p>This email series is stopped.</p>")
                return self.reply(200,'<h1>Stop these emails?</h1><form method="post"><button type="submit">Unsubscribe</button></form>')
            except (ValueError,KeyError,TypeError,json.JSONDecodeError):
                self.reply(400,"Invalid request")
            except Exception:
                self.reply(503,"Temporarily unavailable")
            finally:
                if db:
                    db.db.close()
    return Handler


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config",default="config.json")
    sub = parser.add_subparsers(dest="command",required=True)
    for cmd in ["status","check","run","import","pause","suppress","serve","preview"]:
        p = sub.add_parser(cmd)
        if cmd == "run": p.add_argument("--send",action="store_true")
        if cmd == "import": p.add_argument("file")
        if cmd == "preview": p.add_argument("file",help="output JSON; synthetic recipient only")
        if cmd == "pause":
            p.add_argument("enrollment_id"); p.add_argument("reason")
        if cmd == "suppress": p.add_argument("file",help="private JSON with email and reason")
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    sequence = json.loads(Path(config["sequence_path"]).read_text())
    validate_sequence(sequence)
    if args.command == "check":
        print(canonical({"send_blockers":send_gaps(config,sequence),"sequence_sha256":digest(canonical(sequence))}))
        return
    if args.command == "preview":
        fixture={"id":"preview","sequence_json":canonical(sequence),"email":"preview@example.invalid","first_name":"there"}
        payloads=[render_payload({**fixture,"next_day":day},config,preview=True) for day in range(1,31)]
        Path(args.file).write_text(json.dumps(payloads,indent=2))
        print('{"preview_count":30,"sent":0}')
        return
    if args.command == "serve":
        secret("LFP_EMAIL_UNSUBSCRIBE_SECRET")
        ThreadingHTTPServer(("127.0.0.1",int(config.get("port",8817))),make_handler(config)).serve_forever()
        return
    ledger = Ledger(config)
    try:
        if args.command == "import":
            print(canonical({"enrollment_id":ledger.import_consent(json.loads(Path(args.file).read_text()),sequence)}))
        elif args.command == "pause":
            ledger.pause(args.enrollment_id,args.reason); print('{"paused":true}')
        elif args.command == "suppress":
            data=json.loads(Path(args.file).read_text()); ledger.suppress(data["email"],data["reason"]); print('{"suppressed":true}')
        elif args.command == "run":
            if not args.send:
                print(canonical({"dry_run":True,"send_blockers":send_gaps(config,sequence),**ledger.status()})); return
            gaps=send_gaps(config,sequence)
            if gaps: raise ValueError("Sending blocked: "+", ".join(gaps))
            rows=ledger.db.execute("SELECT id,sequence_hash FROM enrollments WHERE state='active' AND sequence_hash=? ORDER BY next_due LIMIT ?",(config["approved_sequence_sha256"],int(config.get("max_per_run",25)))).fetchall()
            accepted=0
            for row in rows:
                if row["sequence_hash"] != config["approved_sequence_sha256"]: continue
                claim=ledger.claim(row["id"])
                if claim: accepted+=ledger.dispatch(claim,resend_transport)
            print(canonical({"accepted":accepted,**ledger.status()}))
        else:
            print(canonical(ledger.status()))
    finally:
        ledger.db.close()


if __name__ == "__main__":
    try:
        main()
    except (ValueError,KeyError,sqlite3.Error) as error:
        # No raw provider response or imported record is printed.
        print("Blocked: "+str(error),file=sys.stderr)
        raise SystemExit(1)
