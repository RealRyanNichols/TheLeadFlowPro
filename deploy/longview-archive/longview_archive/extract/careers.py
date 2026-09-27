"""Careers pages and the front-office roles a business says it is hiring for.

``careers_links`` finds the site's own careers/jobs pages and links to
well-known applicant-tracking hosts; the archive stores those URLs but never
fetches the tracking hosts. A same-site link counts only on positive evidence:
careers wording in its text, or a path segment that is exactly a careers slug. ``roles_on_page`` is meant for a careers page and
flags only the five roles the directory's hiring view knows about.
"""

from __future__ import annotations

import re
from typing import Dict, List, Tuple
from urllib.parse import urlsplit

from .. import normalize
from .html import Page

ATS_HOSTS = (
    "indeed.com", "workforcenow.adp.com", "applytojob.com", "bamboohr.com", "paylocity.com",
    "jobs.lever.co", "boards.greenhouse.io", "myworkdayjobs.com", "ziprecruiter.com", "jazzhr.com",
    "paycomonline.net", "ultipro.com", "dayforcehcm.com",
)

# The job wording the applicant-tracking hosts are checked against (``_ats_job_link``).
_TEXT_RE = re.compile(
    r"\b(?:careers?|jobs?|employment|join\s+our\s+team|now\s+hiring|we\s*(?:'|\u2019)?\s*re\s+hiring|"
    r"we\s+are\s+hiring|work\s+with\s+us|openings|job\s+opportunities|job\s+openings)\b",
    re.I,
)
_APPLY_RE = re.compile(r"\bapply\b", re.I)
_JOB_WORD_RE = re.compile(
    r"(?:^|[^a-z])(?:careers?|jobs?|employment|hiring|positions?|openings?)(?:$|[^a-z])", re.I
)
_PATH_RE = re.compile(
    r"(?:^|[/_\-.])(?:careers?|jobs?|employment|join[-_]?our[-_]?team|now[-_]?hiring|we[-_]?re[-_]?hiring|"
    r"work[-_]?with[-_]?us|openings|job[-_]?opportunities|hiring)(?:$|[/_\-.])",
    re.I,
)
# Never a careers page, whatever else the link says: payroll and HR logins
# ("Employee Login", "Team Login", "Employee Portal", "Team Member Access"),
# and review or employment-verification pages. Checked on text and path, and
# only as whole phrases: a bare "portal" or "payroll" is not enough ("Career
# Portal" and "Now hiring: Payroll Specialist" are careers links).
_NOT_CAREERS_RE = re.compile(
    r"(?:^|[^a-z])(?:log[\s_-]?(?:in|on)|sign[\s_-]?in|self[\s_-]?service|intranet|"
    r"(?:employees?|staff|team(?:[\s_-]+members?)?)[\s_-]+(?:portal|access|center|resources)|"
    r"pay[\s_-]?stubs?|time[\s_-]?clock|reviews?|verification|verify)(?:$|[^a-z])",
    re.I,
)
# Paycom's employee area (/v4/ee/web.php/app/login), only as a whole path
# segment: a bare "ee" also matched hex GUIDs ("9b4e2ee1-...") in real
# recruiting URLs.
_EE_PATH_RE = re.compile(r"(?:^|/)ee(?:/|$)", re.I)

# ---- Same-site links: counted only on positive evidence.
#
# A same-site link is a careers page when its text says so or a path segment is
# exactly a careers slug. Nothing else: "Job Gallery", "Job Pics", "Latest Jobs"
# and "Jobs We Did" all have a job word but say nothing about hiring, and no
# list of portfolio words can name every variant.
#
# Careers phrases anywhere in the link text.
_CAREERS_TEXT_RE = re.compile(
    r"\b(?:careers|career\s+opportunit(?:y|ies)|employment\s+opportunit(?:y|ies)|"
    r"job\s+(?:openings?|opportunit(?:y|ies)|postings?|listings?)|open\s+positions?|current\s+openings?|"
    r"join\s+our\s+team|work\s+with\s+us|now\s+hiring|we\s*(?:'|\u2019)?\s*re\s+hiring|we\s+are\s+hiring)\b",
    re.I,
)
# Words that count only as the whole link text ("Jobs", "Employment",
# "Openings"), or as a leading label ("Jobs: Project Manager").
_WHOLE_TEXT_RE = re.compile(r"(?:jobs?|employment|openings)(?:\s*:.*)?", re.I | re.S)
# A job word inside longer text that is not a careers phrase ("Job Pics",
# "Featured Jobs", "Residential Jobs"): the text is about jobs done, and a
# /jobs path does not make it a careers page.
_BARE_JOB_RE = re.compile(r"\bjobs?\b", re.I)
# Path segments that are exactly a careers slug (lower case, "_" read as "-",
# a file extension dropped: "/jobs.html", "/Join_Our_Team").
_CAREERS_SLUGS = frozenset((
    "careers", "career", "jobs", "job-openings", "employment", "openings", "positions", "join-our-team",
    "work-with-us", "hiring", "now-hiring", "career-opportunities", "employment-opportunities",
    "job-opportunities", "open-positions", "current-openings",
))
# "Apply" alone is a credit, rental, or enrollment application on dealer,
# apartment, lender, and school sites: /apply or "Apply Now" counts only with a
# job word in the link text or path.
_APPLY_SLUG = "apply"
# A section of a portfolio (/portfolio/jobs, /gallery/careers) is not a careers
# page: whole path segments before the careers slug only.
_PORTFOLIO_SLUGS = frozenset((
    "portfolio", "gallery", "galleries", "photo-gallery", "photos", "pictures", "videos", "projects",
    "our-work", "our-jobs", "showcase",
))
_EXT_RE = re.compile(r"\.[a-z0-9]{1,5}$", re.I)


def _segments(path: str) -> List[str]:
    return [_EXT_RE.sub("", seg).replace("_", "-").lower() for seg in path.split("/") if seg]


def _text_says_careers(text: str) -> bool:
    text = text.strip(" \t\r\n!.?*\u00bb\u203a>|-\u2013\u2014")
    return bool(_CAREERS_TEXT_RE.search(text) or _WHOLE_TEXT_RE.fullmatch(text)
                or (_APPLY_RE.search(text) and _JOB_WORD_RE.search(text)))


def _path_says_careers(path: str, text: str) -> bool:
    """A path segment is exactly a careers slug, and no portfolio segment comes before it."""
    for seg in _segments(path):
        if seg in _PORTFOLIO_SLUGS:
            return False
        if seg in _CAREERS_SLUGS:
            return True
        if seg == _APPLY_SLUG and (_JOB_WORD_RE.search(text) or _JOB_WORD_RE.search(path)):
            return True
    return False


def _same_site_careers(text: str, path: str, query: str = "") -> bool:
    if any(seg in _PORTFOLIO_SLUGS for seg in _segments(path)) and not _path_says_careers(path, text):
        return False
    # A portfolio filter on a /jobs page ("/jobs?cat=gallery") is the portfolio.
    if any(value.replace("_", "-").lower() in _PORTFOLIO_SLUGS for value in re.split(r"[&=;]", query)):
        return False
    if _text_says_careers(text):
        return True
    if _BARE_JOB_RE.search(text):
        return False
    return _path_says_careers(path, text)


# Most applicant-tracking hosts are payroll/HR suites that also serve employee
# logins (login.ultipro.com, access.paylocity.com) and vendor pages, so a link
# to one counts only when it says jobs, is an application, or goes to the
# host's recruiting pages. The job-board hosts serve job listings only. On the
# payroll/HR suites only the recruiting pages count: their root and other pages
# are employee logins ("Employment Portal" to workforcenow.adp.com/).
_JOB_BOARD_HOSTS = ("jobs.lever.co", "boards.greenhouse.io", "applytojob.com", "myworkdayjobs.com")
_HR_SUITE_HOSTS = ("workforcenow.adp.com", "paycomonline.net", "paylocity.com", "ultipro.com", "dayforcehcm.com",
                   "bamboohr.com")
_LOGIN_HOST_RE = re.compile(r"^(?:log[-_]?in|sign[-_]?in|sso|access)\d*\.", re.I)
_RECRUITING_RE = re.compile(r"recruit|requisition|job[\s_-]?board|candidate|(?:^|[/.])(?:ats|jobs|careers)[/.]",
                            re.I)


def _on(host: str, hosts: Tuple[str, ...]) -> bool:
    return any(host == known or host.endswith("." + known) for known in hosts)


def is_ats_host(host: str) -> bool:
    return _on((host or "").lower().rstrip("."), ATS_HOSTS)


_INDEX_RE = re.compile(r"/(?:index|default|home)(?:\.(?:html?|php|aspx?))?$", re.I)


def _page_key(url: str) -> Tuple[str, str, str]:
    """Host (without ``www.``), path (without a trailing ``/``), and query: a ``#section`` is the same page.

    A directory's index file (``/index.html``, ``/index.php``, ``/default.aspx``,
    ``/home``) is the directory itself.
    """
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    path = _INDEX_RE.sub("/", parts.path or "/")
    return host, path.rstrip("/") or "/", parts.query


def _ats_job_link(host: str, text: str, path: str) -> bool:
    if _on(host, _JOB_BOARD_HOSTS):
        return True
    if _LOGIN_HOST_RE.match(host):
        return False
    if _PATH_RE.search(path) or _RECRUITING_RE.search(host + path):
        return True
    return not _on(host, _HR_SUITE_HOSTS) and bool(
        _TEXT_RE.search(text) or _JOB_WORD_RE.search(text) or _APPLY_RE.search(text))


def _careers_page(host: str, path: str, site: str) -> bool:
    """The page itself is a careers page: by its path, or a careers subdomain (``careers.brand.example``)."""
    sub = host[:-len(site)] if site and host.endswith("." + site) else ""
    return _path_says_careers(path, "") or any(label in _CAREERS_SLUGS for label in sub.lower().split("."))


def careers_links(page: Page) -> List[str]:
    """Same-site careers pages and applicant-tracking links, in page order.

    A link back to the page itself (``/#careers`` on a one-page site) is a
    section of that page, not a careers page, and is skipped. So is any
    same-site ``#section`` link (``/about#careers``, ``/index.html#careers``)
    unless the page it lands on is itself a careers page (``/careers#openings``):
    the rest of that page is not about jobs.
    """
    site = normalize.registrable_domain(page.url)
    own = _page_key(normalize.norm_url(page.url) or page.url)
    # A dict keeps page order and checks "seen already?" in constant time; a list took time with
    # the square of the count on a page with tens of thousands of careers links.
    out: Dict[str, None] = {}
    for link in page.links:
        parts = urlsplit(link.url)
        host = (parts.hostname or "").lower()
        text, path = link.text or "", parts.path or ""
        if (_page_key(link.url) == own or _NOT_CAREERS_RE.search(text) or _NOT_CAREERS_RE.search(path)
                or _EE_PATH_RE.search(path)):
            continue
        if is_ats_host(host):
            if _ats_job_link(host, text, path):
                out.setdefault(link.url)
            continue
        if normalize.registrable_domain(host) != site or (link.fragment and not _careers_page(host, path, site)):
            continue
        if _same_site_careers(text, path, parts.query):
            out.setdefault(link.url)
    return list(out)


ROLE_PATTERNS = {
    "front_desk": re.compile(r"\bfront[\s\-]?desk\b", re.I),
    "office_manager": re.compile(r"\boffice\s+managers?\b", re.I),
    "medical_assistant": re.compile(r"\bmedical\s+assistants?\b", re.I),
    "dental_assistant": re.compile(r"\bdental\s+assistants?\b|\bRDA\b"),
    "receptionist": re.compile(r"\breceptionists?\b", re.I),
}
# "MA" is read as medical assistant only on a line that is about a job.
_MA_RE = re.compile(r"\bMAs?\b")
_JOB_CONTEXT = re.compile(
    r"\b(?:hiring|position|positions|job|jobs|opening|openings|apply|seeking|wanted|join|career|careers|"
    r"full[\s\-]?time|part[\s\-]?time|prn|opportunit(?:y|ies)|vacanc(?:y|ies))\b",
    re.I,
)


def roles_on_page(page: Page) -> List[str]:
    """Sorted role flags from front_desk, office_manager, medical_assistant, dental_assistant, receptionist."""
    found = set()
    texts = list(page.lines) + [text for _, text in page.headings] + list(page.list_items)
    for line in texts:
        for role, pattern in ROLE_PATTERNS.items():
            if pattern.search(line):
                found.add(role)
        if _MA_RE.search(line) and _JOB_CONTEXT.search(line):
            found.add("medical_assistant")
    return sorted(found)
