import copy
import json
import tempfile
from pathlib import Path
import unittest

import worker as w
import meta_import as m
from test_worker import sample_sequence


class MetaImportTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.config=json.loads(Path(__file__).with_name("config.example.json").read_text())
        self.config["db_path"]=str(Path(self.temp.name)/"ledger.sqlite3")
        self.config["campaign_start_at"]="2026-09-28T00:00:00Z"
        self.config["meta_import"]["enabled"]=True
        self.now=w.timestamp("2026-09-28T10:00:00Z")
        self.sequence=sample_sequence()
        self.ledger=w.Ledger(self.config)
        self.lead={"id":"immutable-1","form_id":m.FORM_ID,"created_time":"2026-09-28T10:01:00Z","field_data":[
            {"name":"email","values":["example@example.test"]},
            {"name":"full_name","values":["Pat Test"]},
            {"name":m.QUESTION_KEY,"values":["Yes, email me the 30-day series."]}]}

    def tearDown(self):
        self.ledger.db.close(); self.temp.cleanup()

    def test_exact_yes_label_or_declared_key_only(self):
        for answer in m.YES_VALUES:
            lead=copy.deepcopy(self.lead); lead["field_data"][-1]["values"]=[answer]
            record,outcome=m.consent_record(lead,self.config,self.now,self.now+120)
            self.assertEqual(outcome,"explicit_yes"); self.assertTrue(record["consent"]["granted"])
        for answer in ["yes", "No, just contact me about my request.","",None,"Yes, email me the 30-day series. "]:
            lead=copy.deepcopy(self.lead); lead["field_data"][-1]["values"]=[answer]
            record,_=m.consent_record(lead,self.config,self.now,self.now+120)
            self.assertIsNone(record)

    def test_unknown_question_multiple_answers_wrong_form_fail_closed(self):
        for mutator in [lambda x:x["field_data"][-1].update(name="other_question"),lambda x:x["field_data"][-1].update(values=list(m.YES_VALUES)),lambda x:x.update(form_id="1319841020086334")]:
            lead=copy.deepcopy(self.lead); mutator(lead)
            self.assertIsNone(m.consent_record(lead,self.config,self.now,self.now+120)[0])

    def test_no_backfill_before_checkpoint_and_future_timestamps(self):
        for created in ["2026-09-28T09:59:59Z","2026-09-29T10:00:00Z"]:
            lead={**self.lead,"created_time":created}
            self.assertIsNone(m.consent_record(lead,self.config,self.now,self.now+120)[0])
        self.assertEqual(m.initialize(self.ledger,self.now),self.now)
        self.assertEqual(m.initialize(self.ledger,self.now+300),self.now)

    def test_import_requires_initialized_checkpoint_and_explicit_enable(self):
        with self.assertRaises(ValueError): m.apply_batch(self.ledger,self.sequence,[self.lead],True,self.now+120)
        m.initialize(self.ledger,self.now)
        self.config["meta_import"]["enabled"]=False
        with self.assertRaises(ValueError): m.apply_batch(self.ledger,self.sequence,[self.lead],True,self.now+120)

    def test_dry_read_does_not_enroll_apply_dedupes(self):
        m.initialize(self.ledger,self.now)
        preview=m.apply_batch(self.ledger,self.sequence,[self.lead],False,self.now+120)
        self.assertEqual(preview["eligible"],1)
        self.assertEqual(self.ledger.status()["enrollments"],{})
        first=m.apply_batch(self.ledger,self.sequence,[self.lead],True,self.now+120)
        again=m.apply_batch(self.ledger,self.sequence,[self.lead],True,self.now+180)
        self.assertEqual(first["imported"],1); self.assertEqual(again["imported"],0)
        self.assertEqual(self.ledger.status()["enrollments"],{"active":1})
        self.assertEqual(self.ledger.status()["deliveries"],{})

    def test_graph_fetch_uses_only_pinned_page_and_form_and_rejects_wrong_owner(self):
        seen=[]
        def graph(path,params,token):
            seen.append(path)
            if path==m.PAGE_ID:return {"id":m.PAGE_ID,"access_token":"not-a-real-token"}
            if path==m.PAGE_ID+"/leadgen_forms":return {"data":[{"id":m.FORM_ID}]}
            if path==m.FORM_ID+"/leads":return {"data":[self.lead]}
            self.fail("Unexpected Graph path")
        self.assertEqual(m.fetch_new_form(self.config["meta_import"],graph),[self.lead])
        self.assertEqual(seen,[m.PAGE_ID,m.PAGE_ID+"/leadgen_forms",m.FORM_ID+"/leads"])
        with self.assertRaises(ValueError): m.fetch_new_form(self.config["meta_import"],lambda *_:{"id":"another-page"})

    def test_pagination_never_follows_provider_url_and_no_partial_batch(self):
        calls=[]
        def page(path,params,token):
            calls.append((path,params))
            return {"data":[self.lead],"paging":{"next":"https://evil.invalid/steal-token","cursors":{"after":"cursor-1"}}}
        with self.assertRaises(ValueError): m.pages(m.FORM_ID+"/leads",{"limit":100},"not-a-real-token",1,page)
        self.assertEqual(calls[0][0],m.FORM_ID+"/leads")
        self.assertEqual(self.ledger.status()["enrollments"],{})


if __name__=="__main__":unittest.main()
