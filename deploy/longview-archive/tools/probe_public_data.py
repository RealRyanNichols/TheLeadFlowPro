"""Measure Longview against the real public sources, printing counts only.

Run from a machine that can reach data.texas.gov (a GitHub Actions runner):

    cd deploy/longview-archive && python3 tools/probe_public_data.py
    LVA_PLACES=all python3 tools/probe_public_data.py        # every seeded town (places.py)
    LVA_PLACES=longview,marshall python3 tools/probe_public_data.py

It runs the engine's own sync -> match -> publish on a throwaway data folder
for the towns in LVA_PLACES (Longview alone when it is unset) and prints the
counts per town, so a ring of towns is measured before it is turned on,
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

from longview_archive import config, db, matching, places, privacy, publish  # noqa: E402
from longview_archive.sources import franchise as franchise_source  # noqa: E402
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
    towns = places.active(settings)
    say("== 1. The engine's own sync -> match -> publish against the live sources")
    say(f"towns (LVA_PLACES): {', '.join(p.slug for p in towns)}")
    conn = bootstrap(settings)
    for job in SYNC_JOBS:
        outcome = run_sync(conn, settings, job, db.now_iso())
        say(f"sync {job.name}: {outcome.status} {numbers(outcome.counts)}"
            + (f" error={outcome.error}" if outcome.error else ""))
        for slug, one in sorted(((outcome.counts or {}).get("places") or {}).items()):
            say(f"    {slug}: {numbers(one)}")
        for slug, zips in sorted(((outcome.counts or {}).get("other_zips_by_place") or {}).items()):
            # ZIP codes are not personal data; they show which ZIPs a town's rows carry.
            say(f"    {slug} ZIPs outside its list: {dict(sorted(zips.items()))}")
    say(f"match: {numbers(matching.match_pending(conn))}")
    counts = publish.run_publish(conn, settings)
    say(f"publish: {numbers(counts)}")
    for row in conn.execute("SELECT scope, publish_state, IFNULL(publish_reason,'') AS reason, COUNT(*) AS n"
                            " FROM businesses GROUP BY 1,2,3 ORDER BY 1,2,4 DESC"):
        say(f"  scope={row['scope']} state={row['publish_state']} reason={row['reason'] or '-'}: {row['n']}")
    shown = conn.execute("SELECT COUNT(*) FROM businesses WHERE publish_state='ready'").fetchone()[0]
    say(f"PROFILES READY TO PUBLISH (first batch): {shown}")
    per_town(conn, towns)
    published_by_source(conn)
    conn.close()


def per_town(conn, towns) -> None:
    """Counts per town: businesses in the archive by scope, and ready to publish. Never a name."""
    say("per town (active businesses: city / nearby / out; ready to publish):")
    for p in towns:
        row = conn.execute(
            "SELECT SUM(active=1 AND scope='city') AS city, SUM(active=1 AND scope='nearby') AS nearby,"
            " SUM(active=1 AND scope='out') AS out_, SUM(publish_state='ready') AS ready,"
            " SUM(publish_state='held') AS held, SUM(publish_state='review') AS review"
            " FROM businesses WHERE place=?", (p.slug,)).fetchone()
        note = "" if p.zips_known else " (no ZIP list: matched by town name)"
        say(f"  {p.slug}: city={row['city'] or 0} nearby={row['nearby'] or 0} out={row['out_'] or 0}"
            f" ready={row['ready'] or 0} held={row['held'] or 0} review={row['review'] or 0}{note}")


def published_by_source(conn) -> None:
    """Counts only: where the ready profiles come from, and a person-name sanity check."""
    identity, linked = Counter(), Counter()
    # Per the source the shown name comes from: four checks, each broader than the last.
    #   person: privacy.looks_like_person_name (name, or name without its legal form)
    #   owner: privacy.may_name_owner on the name without its legal form (catches given names
    #          not in GIVEN_NAMES and surname-first order: any two plain words with no trade word)
    #   carries: franchise.carries_person_name (the franchise source's own hold rule)
    #   broad: any of the above, or two adjacent plain non-trade words anywhere in the name
    #          (franchise.name_word_run, even in an address-shaped name), or a trust, estate, or
    #          family holding vehicle (franchise.is_trust_or_estate): wider than the hold rule itself,
    #          so a gap in carries_person_name still shows up here
    checks: dict = {}
    for biz in conn.execute("SELECT id, name FROM businesses WHERE publish_state='ready'").fetchall():
        sources = [r["source_id"] for r in conn.execute(
            f"SELECT source_id FROM source_records WHERE business_id=? AND active=1 ORDER BY {matching._ORDER_SQL}",
            (biz["id"],))]
        primary = next((s for s in sources if s in matching.PRIMARY_SOURCES), "none")
        identity[primary] += 1
        for source_id in set(sources):
            linked[source_id] += 1
        name = biz["name"] or ""
        bare = franchise_source.bare_name(name)
        counts = checks.setdefault(primary, Counter())
        counts["person"] += 1 if (privacy.looks_like_person_name(name)
                                  or privacy.looks_like_person_name(bare)) else 0
        counts["owner"] += 1 if privacy.may_name_owner(bare) else 0
        carries = franchise_source.carries_person_name(name)
        counts["carries"] += 1 if carries else 0
        counts["broad"] += 1 if (carries or privacy.looks_like_person_name(name) or privacy.looks_like_person_name(bare)
                                 or privacy.may_name_owner(bare) or franchise_source.name_word_run(name)
                                 or franchise_source.is_trust_or_estate(name)) else 0
    say(f"ready profiles by the source their name comes from: {dict(sorted(identity.items()))}")
    say(f"ready profiles with an active record from: {dict(sorted(linked.items()))}")
    say("ready names that may be a person's, by the source the name comes from (counts only):")
    for source_id in sorted(checks):
        c = checks[source_id]
        say(f"  {source_id}: looks_like_person_name={c['person']} may_name_owner(bare)={c['owner']}"
            f" carries_person_name={c['carries']} broad={c['broad']} (of {identity[source_id]})")
    franchise_counts = checks.get(franchise_source.SOURCE_ID, Counter())
    say(f"  tx_franchise names that should have been held (expected 0): "
        f"{franchise_counts['carries']} by the hold rule, {franchise_counts['broad']} by the broad check")


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
    say(f"    columns: {', '.join(franchise.get('columns_field_name') or [])}")
    if not fcity:
        return
    base = settings.socrata_base.rstrip("/")
    for col in ("taxpayer_organizational_type", "record_type_code", "sos_status_code", "current_exempt_reason_code",
                "right_to_transact_business_code", "taxpayer_state"):
        if col in fcols:
            rows = api_http.get_json(f"{base}/resource/{franchise['id']}.json", settings, params={
                "$select": f"{col}, count(*) AS n", "$where": f"upper({fcity})='LONGVIEW'",
                "$group": col, "$order": "n DESC", "$limit": 15}) or []
            say(f"    Longview by {col}: {[(r.get(col), r.get('n')) for r in rows]}")
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


RING_ONE = ("MARSHALL", "KILGORE", "WHITE OAK", "HALLSVILLE", "DIANA", "HARLETON", "GLADEWATER", "CLARKSVILLE CITY",
            "EASTON", "SCOTTSVILLE", "ELYSIAN FIELDS", "WASKOM", "ORE CITY", "GILMER", "KARNACK", "JEFFERSON",
            "TATUM", "HENDERSON", "CARTHAGE", "BECKVILLE", "LONE STAR", "DAINGERFIELD", "BIG SANDY", "HAWKINS",
            "OVERTON", "NEW LONDON", "TYLER", "LONGVIEW")


def towns(settings) -> None:
    say()
    say("== 5. Nearby towns: active sales-tax outlets and good-standing franchise companies by postal city (counts only)")
    try:
        sales = next((r["resource"] for r in catalog(settings, "active sales tax permit holders")
                      if "sales tax" in str(r.get("resource", {}).get("name", "")).lower()), None)
        franchise = next((r["resource"] for r in catalog(settings, "active franchise taxpayers")
                          if "franchise" in str(r.get("resource", {}).get("name", "")).lower()), None)
    except Exception as exc:  # noqa: BLE001
        say(f"catalog: {type(exc).__name__}")
        return
    for town in RING_ONE:
        s_n = count_where(settings, sales["id"], f"upper(outlet_city)='{town}'") if sales else None
        s_in = count_where(settings, sales["id"], f"upper(outlet_city)='{town}' AND outlet_inside_outside_city_limits_indicator='I'") if sales else None
        f_n = count_where(settings, franchise["id"], f"upper(taxpayer_city)='{town}' AND right_to_transact_business_code='A'") if franchise else None
        say(f"{town}: sales_tax_outlets={s_n} (inside city limits {s_in}) franchise_good_standing={f_n}")


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
        for step in (engine_run, franchise_overlap, towns):
            try:
                step(settings)
            except Exception as exc:  # noqa: BLE001 - report and keep going
                say(f"{step.__name__} failed: {exc.__class__.__name__}: {str(exc)[:300]}")
    where_things_answer()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
