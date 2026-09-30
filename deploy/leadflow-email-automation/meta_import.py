#!/usr/bin/env python3
"""New-form-only Meta consent importer. Inert unless explicitly requested.

No webhooks are subscribed, campaigns changed, messages sent, or CRM rows written.
Default invocation reports gates only. --initialize records a start checkpoint
NOW; --fetch reads Meta; --fetch --apply requires the separate import enable flag.
"""
import argparse
import json
import os
from pathlib import Path
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import worker as w

PAGE_ID = "887023637835514"
FORM_ID = "2206768963231960"
QUESTION_KEY = "would_you_like_the_leadflow_pro’s_30-day_email_series?_one_helpful_email_a_day_with_business_tools,_examples_and_service_offers._unsubscribe_anytime._optional—your_callback_does_not_depend_on_this."
YES_VALUES = {"Yes, email me the 30-day series.","yes,_email_me_the_30-day_series."}


def validate_config(config):
    settings=config.get("meta_import",{})
    if settings.get("page_id") != PAGE_ID or settings.get("form_id") != FORM_ID:
        raise ValueError("Meta importer is pinned to the reviewed LeadFlow Page and new form")
    if settings.get("question_key") != QUESTION_KEY or set(settings.get("yes_values",[])) != YES_VALUES:
        raise ValueError("Exact Graph question and answer configuration required")
    if settings.get("graph_version") != "v21.0":
        raise ValueError("Graph version change requires review")
    if not config.get("consent_notice") or not settings.get("notice_version"):
        raise ValueError("Reviewed notice and version required")
    return settings


def initialize(ledger, now=None):
    now=time.time() if now is None else now
    ledger.db.executescript("""
      CREATE TABLE IF NOT EXISTS meta_import_start (
        form_id TEXT PRIMARY KEY, started_at REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta_import_seen (
        form_id TEXT NOT NULL, source_lead_id TEXT NOT NULL, outcome TEXT NOT NULL,
        observed_at REAL NOT NULL, PRIMARY KEY(form_id,source_lead_id)
      );
    """)
    with ledger.transaction():
        ledger.db.execute("INSERT OR IGNORE INTO meta_import_start VALUES(?,?)",(FORM_ID,now))
    return ledger.db.execute("SELECT started_at FROM meta_import_start WHERE form_id=?",(FORM_ID,)).fetchone()[0]


def start_checkpoint(ledger):
    exists=ledger.db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='meta_import_start'").fetchone()
    row=ledger.db.execute("SELECT started_at FROM meta_import_start WHERE form_id=?",(FORM_ID,)).fetchone() if exists else None
    if not row:
        raise ValueError("Initialize a new start checkpoint first; historical import is disabled")
    configured=ledger.config.get("campaign_start_at")
    if not configured:
        raise ValueError("Campaign activation timestamp is not configured")
    return max(row[0],w.timestamp(configured))


def consent_record(lead,config,start,now):
    """Never treat a phone, missing answer, other question or substring as yes."""
    validate_config(config)
    if str(lead.get("form_id","")) != FORM_ID or not lead.get("id"):
        return None,"wrong_form_or_missing_id"
    created=w.timestamp(lead["created_time"])
    if created<start:
        return None,"before_checkpoint"
    if created>now+60:
        return None,"future_timestamp"
    pairs=lead.get("field_data",[])
    if not isinstance(pairs,list):
        return None,"invalid_fields"
    fields={}
    for pair in pairs:
        if not isinstance(pair,dict) or not isinstance(pair.get("name"),str):
            return None,"invalid_fields"
        if pair["name"] in fields:
            return None,"duplicate_field"
        fields[pair["name"]]=pair.get("values")
    choice=fields.get(QUESTION_KEY)
    if not isinstance(choice,list) or len(choice)!=1 or choice[0] not in YES_VALUES:
        return None,"not_explicit_yes"
    values=fields.get("email")
    if not isinstance(values,list) or len(values)!=1:
        return None,"missing_email"
    email=w.email_address(values[0])
    name=fields.get("full_name",["there"])
    first=(name[0].split()[0] if isinstance(name,list) and name and isinstance(name[0],str) and name[0].split() else "there")
    return {"source":"meta_lead_ad","source_lead_id":str(lead["id"]),"email":email,"first_name":first,
            "consent":{"granted":True,"channel":"email","daily_for_30_days":True,"form_id":FORM_ID,
                       "notice_text":config["consent_notice"],"notice_version":config["meta_import"]["notice_version"],
                       "evidence_id":"meta:"+str(lead["id"]),"granted_at":lead["created_time"],
                       "question_key":QUESTION_KEY,"answer":choice[0]}},"explicit_yes"


def graph_get(path,params,token):
    if not token:
        raise ValueError("Existing META_PAGE_ACCESS_TOKEN must be supplied privately")
    url="https://graph.facebook.com/v21.0/"+path+"?"+urlencode(params)
    request=Request(url,headers={"Authorization":"Bearer "+token,"User-Agent":"LeadFlow-DO-Consent-Importer/1.0"})
    try:
        with urlopen(request,timeout=15) as response:
            body=json.loads(response.read(2_000_000))
        if not isinstance(body,dict) or "error" in body:
            raise ValueError("Meta did not return usable data")
        return body
    except HTTPError as error:
        # Never print a provider body or URL that might contain credential data.
        raise ValueError(f"Meta read failed with HTTP {error.code}; inspect account permissions") from None
    except (URLError,TimeoutError,OSError):
        raise ValueError("Meta read unavailable; no enrollment changes made") from None


def pages(path,params,token,max_pages,getter=graph_get):
    out=[]; after=None
    for _ in range(max_pages):
        body=getter(path,{**params,**({"after":after} if after else {})},token)
        rows=body.get("data")
        if not isinstance(rows,list):
            raise ValueError("Unexpected Meta list response")
        out.extend(rows)
        paging=body.get("paging") or {}
        if not paging.get("next"):
            return out
        new_after=(paging.get("cursors") or {}).get("after")
        if not isinstance(new_after,str) or new_after==after:
            raise ValueError("Meta pagination could not be completed; import stopped")
        after=new_after
    raise ValueError("Meta page limit reached; no partial batch is imported")


def fetch_new_form(settings,getter=graph_get):
    token=os.environ.get("META_PAGE_ACCESS_TOKEN","")
    page=getter(PAGE_ID,{"fields":"id,access_token"},token)
    if str(page.get("id",""))!=PAGE_ID:
        raise ValueError("Wrong Meta Page identity")
    token=page.get("access_token") or token
    max_pages=int(settings.get("max_pages",5))
    if not 1<=max_pages<=20:
        raise ValueError("Meta page limit must be between 1 and 20")
    forms=pages(PAGE_ID+"/leadgen_forms",{"fields":"id","limit":100},token,max_pages,getter)
    if not any(str(form.get("id",""))==FORM_ID for form in forms):
        raise ValueError("The new form was not found on the verified LeadFlow Page")
    # Every page is collected before any ledger write. Provider next URLs are
    # never followed; opaque cursor only, always the exact known Graph endpoint.
    return pages(FORM_ID+"/leads",{"fields":"id,created_time,form_id,field_data","limit":100},token,max_pages,getter)


def apply_batch(ledger,sequence,leads,apply=False,now=None):
    now=time.time() if now is None else now
    settings=validate_config(ledger.config)
    start=start_checkpoint(ledger)
    if apply and settings.get("enabled") is not True:
        raise ValueError("Meta ledger import is disabled")
    counts={"checked":0,"eligible":0,"imported":0,"skipped":0,"invalid":0}
    for lead in leads:
        counts["checked"]+=1
        try:
            record,reason=consent_record(lead,ledger.config,start,now)
        except (ValueError,KeyError,TypeError):
            counts["invalid"]+=1; continue
        seen=ledger.db.execute("SELECT 1 FROM meta_import_seen WHERE form_id=? AND source_lead_id=?",(FORM_ID,str(lead.get("id","")))).fetchone()
        if seen or not record:
            counts["skipped"]+=1
            continue
        counts["eligible"]+=1
        if not apply:
            continue
        # Enrollment's consent/hash/id dedupe makes a crash between these two
        # transactions safe. No notification or email is sent by import.
        try:
            enrollment_id=ledger.import_consent(record,sequence,now)
        except (ValueError,w.sqlite3.IntegrityError):
            counts["invalid"]+=1; continue
        with ledger.transaction():
            ledger.db.execute("INSERT OR IGNORE INTO meta_import_seen VALUES(?,?,?,?)",(FORM_ID,str(lead["id"]),"enrolled",now))
            ledger.audit("meta_consent_import",enrollment_id,"new form exact affirmative answer",now)
        counts["imported"]+=1
    return counts


def main():
    os.umask(0o077)
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config",default="config.json")
    parser.add_argument("--initialize",action="store_true")
    parser.add_argument("--fetch",action="store_true")
    parser.add_argument("--apply",action="store_true")
    args=parser.parse_args()
    config=json.loads(Path(args.config).read_text()); settings=validate_config(config)
    if args.apply and not args.fetch:
        raise ValueError("--apply requires --fetch")
    if not args.initialize and not args.fetch:
        print(w.canonical({"dry_run":True,"fetch":False,"import_enabled":settings.get("enabled") is True,"form_id":FORM_ID})); return
    if args.initialize and args.fetch:
        raise ValueError("Initialize separately, then review the checkpoint before fetching")
    ledger=w.Ledger(config)
    try:
        if args.initialize:
            stamp=initialize(ledger)
            print(w.canonical({"initialized":True,"start_at":w.datetime.fromtimestamp(stamp,w.UTC).isoformat(),"historical_backfill":False})); return
        start_checkpoint(ledger)
        if args.apply and settings.get("enabled") is not True:
            raise ValueError("Import disabled; no Meta fetch performed")
        sequence=json.loads(Path(config["sequence_path"]).read_text()); w.validate_sequence(sequence)
        leads=fetch_new_form(settings)
        print(w.canonical({"dry_run":not args.apply,**apply_batch(ledger,sequence,leads,args.apply)}))
    finally:
        ledger.db.close()


if __name__=="__main__":
    try: main()
    except (ValueError,KeyError,w.sqlite3.Error) as error:
        raise SystemExit("Blocked: "+str(error))
