import base64
import hashlib
import hmac
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
import json
import io
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch, MagicMock

import worker as w


def sample_sequence():
    return {"sequence_id":"test_campaign","version":"v1","timezone":"America/Chicago","approved_for_sending":True,
            "sender":{"name":"Test Sender","email":"sender@example.test","reply_to":"reply@example.test"},
            "footer":{"business_name":"Test Business","mailing_address":"Test postal address"},
            "emails":[{"day":d,"subject":f"Day {d}","body":["Hello {{first_name}}","A useful idea."],"cta":{"label":"Reply","url":"mailto:reply@example.test"}} for d in range(1,31)]}


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.env=patch.dict(os.environ,{"LFP_EMAIL_UNSUBSCRIBE_SECRET":"u"*40,"RESEND_API_KEY":"r"*40,"RESEND_WEBHOOK_SECRET":"whsec_"+base64.b64encode(b"s"*24).decode()})
        self.env.start()
        self.sequence=sample_sequence()
        self.now=w.timestamp("2026-09-27T09:00:00-05:00")
        self.config={"db_path":str(Path(self.temp.name)/"ledger.db"),"allowed_sources":["meta_lead_ad"],
                     "allowed_form_ids":["new-consent-form"],"consent_notice":"One email daily for 30 days. Optional.",
                     "suppression_reconciled":True,"suppression_reconciled_at":None,"suppression_reconciliation_max_age_seconds":3600,
                     "campaign_start_at":"2026-09-27T00:00:00-05:00","public_base_url":"https://example.test/automation-email"}
        self.record={"source":"meta_lead_ad","source_lead_id":"source-1","email":"person@example.test","first_name":"Pat",
                     "consent":{"granted":True,"channel":"email","daily_for_30_days":True,"notice_text":self.config["consent_notice"],
                                "notice_version":"v1","evidence_id":"submission-1","form_id":"new-consent-form","granted_at":"2026-09-27T09:00:00-05:00"}}
        self.ledger=w.Ledger(self.config)

    def tearDown(self):
        self.ledger.db.close()
        self.env.stop()
        self.temp.cleanup()

    def enroll(self):
        return self.ledger.import_consent(self.record,self.sequence,self.now)

    def due(self,enrollment_id):
        due=self.ledger.db.execute("SELECT next_due FROM enrollments WHERE id=?",(enrollment_id,)).fetchone()[0]
        # Test fixture simulates a completed external reconciliation at this run.
        self.config["suppression_reconciled_at"]=w.datetime.fromtimestamp(due,w.UTC).isoformat()
        return due

    def test_missing_consent_and_callback_form_rejected(self):
        for key,value in [("granted",False),("daily_for_30_days",False),("form_id","1319841020086334"),("notice_text","different")]:
            record=json.loads(json.dumps(self.record)); record["consent"][key]=value
            with self.assertRaises(ValueError): self.ledger.import_consent(record,self.sequence,self.now)
        self.assertEqual(self.ledger.status()["enrollments"],{})

    def test_import_is_idempotent_immutable_and_does_not_resume(self):
        eid=self.enroll()
        self.assertEqual(eid,self.enroll())
        self.ledger.pause(eid,"reply",self.now)
        self.assertEqual(eid,self.enroll())
        self.assertEqual(self.ledger.status()["enrollments"],{"paused":1})
        changed={**self.record,"email":"other@example.test"}
        with self.assertRaises(ValueError): self.ledger.import_consent(changed,self.sequence,self.now)

    def test_duplicate_email_different_source_id_cannot_double_enroll(self):
        self.enroll()
        with self.assertRaises(w.sqlite3.IntegrityError):
            self.ledger.import_consent({**self.record,"source_lead_id":"source-2"},self.sequence,self.now)

    def test_due_at_chicago_ten_at_least_24_hours(self):
        eid=self.enroll(); due=self.due(eid)
        self.assertGreaterEqual(due-self.now,w.DAY)
        self.assertEqual(w.datetime.fromtimestamp(due,w.CENTRAL).hour,10)
        self.assertIsNone(self.ledger.claim(eid,due-1))
        self.assertIsNone(self.ledger.claim(eid,due+3600))

    def test_dst_never_shortens_24_hours(self):
        spring=w.timestamp("2027-03-13T10:00:00-06:00")
        slot=w.next_slot(spring+w.DAY)
        self.assertGreaterEqual(slot-spring,w.DAY)
        self.assertEqual(w.datetime.fromtimestamp(slot,w.CENTRAL).isoformat(),"2027-03-15T10:00:00-05:00")
        fall=w.timestamp("2026-10-31T10:00:00-05:00")
        self.assertEqual(w.next_slot(fall+w.DAY)-fall,25*3600)

    def test_atomic_claim_two_connections(self):
        eid=self.enroll(); due=self.due(eid)
        other=w.Ledger(self.config)
        try:
            self.assertIsNotNone(self.ledger.claim(eid,due))
            self.assertIsNone(other.claim(eid,due))
            self.assertEqual(other.db.execute("SELECT count(*) FROM deliveries").fetchone()[0],1)
        finally: other.db.close()

    def test_simultaneous_workers_have_one_claim_winner(self):
        eid=self.enroll(); due=self.due(eid); barrier=threading.Barrier(2); results=[]; errors=[]
        def contend():
            other=None
            try:
                other=w.Ledger(self.config); barrier.wait(timeout=5)
                results.append(other.claim(eid,due))
            except Exception as error: errors.append(error)
            finally:
                if other: other.db.close()
        threads=[threading.Thread(target=contend) for _ in range(2)]
        for thread in threads: thread.start()
        for thread in threads: thread.join(timeout=10)
        self.assertFalse(errors)
        self.assertEqual(len(results),2)
        self.assertEqual(sum(item is not None for item in results),1)

    def test_provider_accepted_crash_retries_same_request(self):
        eid=self.enroll(); due=self.due(eid); claim=self.ledger.claim(eid,due); requests=[]
        def accepted_then_crash(payload,key):
            requests.append((payload,key))
            raise RuntimeError("Simulated process failure after provider acceptance")
        with self.assertRaises(RuntimeError): self.ledger.dispatch(claim,accepted_then_crash,due)
        retry=self.ledger.claim(eid,due+1800)
        def replay(payload,key): requests.append((payload,key)); return "accepted","same-provider-id"
        self.assertTrue(self.ledger.dispatch(retry,replay,due+1800))
        self.assertEqual(requests[0],requests[1])
        self.assertEqual(self.ledger.status()["deliveries"],{"accepted":1})

    def test_ambiguous_retry_frozen_payload_and_key(self):
        eid=self.enroll(); due=self.due(eid); first=self.ledger.claim(eid,due)
        seen=[]
        def ambiguous(payload,key): seen.append((payload,key)); return "ambiguous",None
        self.assertFalse(self.ledger.dispatch(first,ambiguous,due))
        self.assertIsNone(self.ledger.claim(eid,due+1799))
        self.ledger.db.execute("UPDATE enrollments SET first_name='Changed' WHERE id=?",(eid,))
        retry=self.ledger.claim(eid,due+1800)
        self.ledger.dispatch(retry,ambiguous,due+1800)
        self.assertEqual(seen[0],seen[1])
        self.assertIn("Hello Pat",seen[1][0])

    def test_crash_lease_retry_and_stale_claim_cannot_send(self):
        eid=self.enroll(); due=self.due(eid); first=self.ledger.claim(eid,due)
        second=self.ledger.claim(eid,due+1800)
        self.assertIsNotNone(second)
        transport=lambda *_: self.fail("stale claim sent")
        self.assertFalse(self.ledger.dispatch(first,transport,due+1800))

    def test_expired_ambiguous_delivery_stops_sequence(self):
        eid=self.enroll(); due=self.due(eid); claim=self.ledger.claim(eid,due)
        self.ledger.dispatch(claim,lambda *_:("ambiguous",None),due)
        self.assertIsNone(self.ledger.claim(eid,due+w.RETRY_WINDOW))
        self.assertEqual(self.ledger.status()["deliveries"],{"review":1})
        self.assertEqual(self.ledger.status()["enrollments"],{"paused":1})

    def test_pause_or_suppression_after_claim_wins(self):
        eid=self.enroll(); due=self.due(eid); claim=self.ledger.claim(eid,due)
        self.ledger.pause(eid,"booking",due)
        self.assertFalse(self.ledger.dispatch(claim,lambda *_:self.fail("paused lead sent"),due))
        self.ledger.suppress(self.record["email"],"unsubscribe",due)
        self.assertEqual(eid,self.enroll())
        self.assertEqual(self.ledger.status()["enrollments"],{"suppressed":1})

    def test_30_days_finish_no_catchup_burst(self):
        eid=self.enroll(); calls=[]
        for day in range(1,31):
            due=self.due(eid)
            # First run was missed for a week; one step only when it resumes.
            if day==1: due+=7*w.DAY
            self.config["suppression_reconciled_at"]=w.datetime.fromtimestamp(due,w.UTC).isoformat()
            claim=self.ledger.claim(eid,due)
            self.assertEqual(claim["day"],day)
            def send(payload,key): calls.append(key); return "accepted",f"provider-{day}"
            self.assertTrue(self.ledger.dispatch(claim,send,due))
            self.assertIsNone(self.ledger.claim(eid,due))
            if day<30: self.assertGreaterEqual(self.due(eid)-due,w.DAY)
        self.assertEqual(len(set(calls)),30)
        self.assertEqual(self.ledger.status()["enrollments"],{"completed":1})

    def test_actual_accept_time_is_spacing_anchor(self):
        eid=self.enroll(); due=self.due(eid); claim=self.ledger.claim(eid,due)
        with patch("worker.time.time",side_effect=[due,due+8]):
            self.ledger.dispatch(claim,lambda *_:("accepted","provider"))
        row=self.ledger.db.execute("SELECT last_accepted_at,next_due FROM enrollments WHERE id=?",(eid,)).fetchone()
        self.assertEqual(row[0],due+8)
        self.assertGreaterEqual(row[1]-(due+8),w.DAY)
        self.assertLess(row[1]-due,25*3600)

    def test_svix_official_vector_and_tamper_and_replay_bounds(self):
        raw=b'{"event_type":"ping","data":{"success":true}}'
        headers={"svix-id":"msg_loFOjxBNrRLzqYUf","svix-timestamp":"1731705121","svix-signature":"v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0="}
        key="whsec_plJ3nmyCDGBKInavdOK15jsl"
        self.assertTrue(w.verify_svix(raw,headers,key,1731705121))
        self.assertFalse(w.verify_svix(raw+b" ",headers,key,1731705121))
        self.assertFalse(w.verify_svix(raw,headers,key,1731705422))
        self.assertFalse(w.verify_svix(raw,headers,key,1731704819))
        headers["svix-signature"]="v2,ignored "+headers["svix-signature"]
        self.assertTrue(w.verify_svix(raw,headers,key,1731705121))

    def test_events_suppress_once_and_never_resume(self):
        self.enroll()
        raw=json.dumps({"type":"email.bounced","data":{"email_id":"provider-1","to":[self.record["email"],"other@example.test"]}}).encode()
        self.assertTrue(self.ledger.provider_event("event1",raw,self.now))
        self.assertFalse(self.ledger.provider_event("event1",raw,self.now))
        self.ledger.provider_event("event2",json.dumps({"type":"suppression.removed","data":{"email":self.record["email"]}}).encode(),self.now)
        self.assertEqual(self.ledger.status()["suppressions"],2)
        self.assertEqual(self.ledger.status()["enrollments"],{"suppressed":1})

    def test_reconciliation_evidence_missing_invalid_future_or_expired_blocks(self):
        iso=lambda value:w.datetime.fromtimestamp(value,w.UTC).isoformat()
        fresh={**self.config,"suppression_reconciled_at":iso(self.now)}
        self.assertEqual(w.suppression_gaps(fresh,self.now+3599),[])
        self.assertTrue(w.suppression_gaps(fresh,self.now+3600))
        for stamp in [None,"bad","2026-09-27T09:00:00",iso(self.now+1)]:
            with self.subTest(stamp=stamp):
                changed={**fresh,"suppression_reconciled_at":stamp}
                self.assertTrue(w.suppression_gaps(changed,self.now))
                self.assertIn("recent suppression reconciliation",w.send_gaps(changed,self.sequence,self.now))
        for maximum in [None,False,0,-1,"3600",float("inf"),float("nan")]:
            with self.subTest(maximum=maximum):
                self.assertTrue(w.suppression_gaps({**fresh,"suppression_reconciliation_max_age_seconds":maximum},self.now))
        self.assertTrue(w.suppression_gaps({**fresh,"suppression_reconciled":False},self.now))
        self.config.update(fresh)
        self.assertTrue(self.ledger.status(self.now)["suppression_reconciliation"]["ready"])
        stale=self.ledger.status(self.now+3600)["suppression_reconciliation"]
        self.assertFalse(stale["ready"])
        self.assertIn("recent suppression reconciliation",stale["blockers"])

    def test_dispatch_rechecks_freshness_after_claim_and_blocks_retry_until_reconciled(self):
        eid=self.enroll(); due=self.due(eid)
        self.config["suppression_reconciled_at"]=w.datetime.fromtimestamp(due-3599,w.UTC).isoformat()
        self.assertEqual(w.suppression_gaps(self.config,due),[])
        claim=self.ledger.claim(eid,due)
        transport=MagicMock(return_value=("accepted","provider-test"))
        self.assertFalse(self.ledger.dispatch(claim,transport,due+1))
        transport.assert_not_called()
        blocked=self.ledger.db.execute("SELECT * FROM deliveries").fetchone()
        self.assertEqual(blocked["error_code"],"suppression_reconciliation_required")
        self.assertIsNone(blocked["claim_token"])
        self.config["suppression_reconciled_at"]=w.datetime.fromtimestamp(due+1800,w.UTC).isoformat()
        retry=self.ledger.claim(eid,due+1800)
        self.assertEqual(retry["payload"],claim["payload"])
        self.assertEqual(retry["idempotency_key"],claim["idempotency_key"])
        self.assertTrue(self.ledger.dispatch(retry,transport,due+1800))
        transport.assert_called_once()

    def test_signed_suppression_before_enrollment_persists_and_other_events_do_not(self):
        server=ThreadingHTTPServer(("127.0.0.1",0),w.make_handler(self.config))
        thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
        key=base64.b64decode(os.environ["RESEND_WEBHOOK_SECRET"][6:])
        def post(event_id,event,valid=True):
            raw=json.dumps(event).encode(); stamp=str(int(w.time.time()))
            signature=base64.b64encode(hmac.new(key,f"{event_id}.{stamp}.".encode()+raw,hashlib.sha256).digest()).decode()
            conn=HTTPConnection("127.0.0.1",server.server_port)
            conn.request("POST","/automation-email/resend-events",raw,{"svix-id":event_id,"svix-timestamp":stamp,"svix-signature":"v1,"+(signature if valid else "invalid")})
            response=conn.getresponse(); response.read(); conn.close(); return response.status
        try:
            for index,kind in enumerate(["email.bounced","email.complained","email.suppressed","suppression.added","contact.updated"]):
                email=f"person{index}@example.test"
                data={"to":[f"  PERSON{index}@EXAMPLE.TEST  ",None,{}],"email":f"  PERSON{index}@EXAMPLE.TEST  ","unsubscribed":True}
                event={"type":kind,"data":data}
                self.assertEqual(post(f"bad-{index}",event,False),400)
                self.assertEqual(post(f"event-{index}",event),200)
                self.assertEqual(post(f"event-{index}",event),200)
                with self.assertRaisesRegex(ValueError,"suppressed"):
                    self.ledger.import_consent({**self.record,"email":email,"source_lead_id":str(index)},self.sequence,self.now)
            self.assertEqual(post("delivered",{"type":"email.delivered","data":{"to":["unrelated@example.test"]}}),200)
            self.assertEqual(post("not-optout",{"type":"contact.updated","data":{"email":"unrelated@example.test","unsubscribed":False}}),200)
            self.assertEqual(self.ledger.status()["suppressions"],5)
            self.assertEqual(self.ledger.status()["enrollments"],{})
        finally:
            server.shutdown(); server.server_close(); thread.join()

    def test_disabled_gate_and_preview_never_needs_secret(self):
        self.assertIn("enabled",w.send_gaps(self.config,self.sequence))
        fixture={"id":"preview","sequence_json":w.canonical(self.sequence),"next_day":1,"first_name":"<script>","email":"preview@example.invalid"}
        with patch.dict(os.environ,{},clear=True): payload=w.render_payload(fixture,self.config,preview=True)
        self.assertIn("&lt;script&gt;",payload["html"])
        self.assertNotIn("<script>",payload["html"])
        self.assertIn("example.invalid",payload["headers"]["List-Unsubscribe"])
        self.assertIn('href="mailto:reply@example.test"',payload["html"])
        self.assertIn('href="tel:+19035008898"',payload["html"])
        self.assertIn('href="sms:+19035008898"',payload["html"])
        self.assertIn('href="https://www.theleadflowpro.com/privacy"',payload["html"])

    def test_provider_2xx_without_message_id_is_ambiguous(self):
        for body in [b"not JSON",b"{}",b'{"id":null}',b'{"id":""}']:
            response=MagicMock(); response.__enter__.return_value.read.return_value=body
            with patch("worker.urlopen",return_value=response):
                self.assertEqual(w.resend_transport("{}","test-key"),("ambiguous",None))
        response=MagicMock(); response.__enter__.return_value.read.return_value=b'{"id":"known-id"}'
        with patch("worker.urlopen",return_value=response) as mocked:
            self.assertEqual(w.resend_transport("{}","test-key"),("accepted","known-id"))
            self.assertEqual(mocked.call_args.args[0].get_header("User-agent"),"LeadFlow-DO-Email-Worker/1.0")

    def test_approved_version_filter_precedes_batch_limit(self):
        old=json.loads(json.dumps(self.sequence)); old["version"]="old"
        old_id=self.ledger.import_consent({**self.record,"email":"older@example.test","source_lead_id":"older"},old,self.now)
        current_id=self.enroll(); due=self.due(current_id)
        config={**self.config,"enabled":True,"sender_verified":True,"suppression_reconciled":True,"webhook_ready":True,
                "approved_sequence_sha256":w.digest(w.canonical(self.sequence)),"max_per_run":1}
        sequence_path=Path(self.temp.name)/"sequence.json"; sequence_path.write_text(json.dumps(self.sequence))
        config["sequence_path"]=str(sequence_path)
        config_path=Path(self.temp.name)/"config.json"; config_path.write_text(json.dumps(config))
        with patch("sys.argv",["worker.py","--config",str(config_path),"run","--send"]),patch("worker.time.time",return_value=due),patch("worker.resend_transport",return_value=("accepted","test-provider")),patch("sys.stdout",new_callable=io.StringIO):
            w.main()
        delivery=self.ledger.db.execute("SELECT enrollment_id FROM deliveries").fetchone()
        self.assertEqual(delivery[0],current_id)
        self.assertNotEqual(delivery[0],old_id)

    def test_http_get_does_not_unsubscribe_post_does(self):
        eid=self.enroll()
        server=ThreadingHTTPServer(("127.0.0.1",0),w.make_handler(self.config))
        thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
        target="/automation-email/unsubscribe?"+w.urlencode({"id":eid,"t":w.unsubscribe_token(eid)})
        try:
            for method in ["GET","POST","POST"]:
                connection=HTTPConnection("127.0.0.1",server.server_port)
                connection.request(method,target)
                response=connection.getresponse(); response.read(); connection.close()
                self.assertEqual(response.status,200)
                expected={"active":1} if method=="GET" else {"suppressed":1}
                self.assertEqual(self.ledger.status()["enrollments"],expected)
        finally:
            server.shutdown(); server.server_close(); thread.join()

    def test_webhook_http_checks_signature_before_mutation_and_dedupes(self):
        self.enroll()
        raw=json.dumps({"type":"contact.updated","data":{"email":self.record["email"],"unsubscribed":True}}).encode()
        stamp=str(int(w.time.time())); event_id="evt-test"
        key=base64.b64decode(os.environ["RESEND_WEBHOOK_SECRET"][6:])
        sig=base64.b64encode(hmac.new(key,f"{event_id}.{stamp}.".encode()+raw,hashlib.sha256).digest()).decode()
        server=ThreadingHTTPServer(("127.0.0.1",0),w.make_handler(self.config))
        thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
        try:
            for valid in [False,True,True]:
                conn=HTTPConnection("127.0.0.1",server.server_port)
                headers={"svix-id":event_id,"svix-timestamp":stamp,"svix-signature":"v1,"+(sig if valid else "wrong")}
                conn.request("POST","/automation-email/resend-events",raw,headers)
                response=conn.getresponse(); response.read(); conn.close()
                self.assertEqual(response.status,200 if valid else 400)
                self.assertEqual(self.ledger.status()["suppressions"],1 if valid else 0)
            self.assertEqual(self.ledger.db.execute("SELECT count(*) FROM provider_events").fetchone()[0],1)
        finally:
            server.shutdown(); server.server_close(); thread.join()


if __name__=="__main__": unittest.main()
