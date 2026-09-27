"""Careers pages and the front-office roles a business says it is hiring for.

``careers_links`` finds the site's own careers/jobs pages and links to
well-known applicant-tracking hosts; the archive stores those URLs but never
fetches the tracking hosts. ``roles_on_page`` is meant for a careers page and
flags only the five roles the directory's hiring view knows about.
"""

from __future__ import annotations

import re
from typing import List, Tuple
from urllib.parse import urlsplit

from .. import normalize
from .html import Page

ATS_HOSTS = (
    "indeed.com", "workforcenow.adp.com", "applytojob.com", "bamboohr.com", "paylocity.com",
    "jobs.lever.co", "boards.greenhouse.io", "myworkdayjobs.com", "ziprecruiter.com", "jazzhr.com",
    "paycomonline.net", "ultipro.com", "dayforcehcm.com",
)

_TEXT_RE = re.compile(
    r"\b(?:careers?|jobs?|employment|join\s+our\s+team|now\s+hiring|we\s*(?:'|’)?\s*re\s+hiring|"
    r"we\s+are\s+hiring|work\s+with\s+us|openings|job\s+opportunities|job\s+openings)\b",
    re.I,
)
# "Apply Now" alone is not a careers link: dealers, apartments, lenders, and
# schools use it for credit, rental, and enrollment applications. It counts
# only when the link text or path also says jobs/careers/employment/hiring/
# positions/openings (or the link goes to an applicant-tracking host).
_APPLY_RE = re.compile(r"\bapply\b", re.I)
_JOB_WORD_RE = re.compile(
    r"(?:^|[^a-z])(?:careers?|jobs?|employment|hiring|positions?|openings?)(?:$|[^a-z])", re.I
)
_PATH_RE = re.compile(
    r"(?:^|[/_\-.])(?:careers?|jobs?|employment|join[-_]?our[-_]?team|now[-_]?hiring|we[-_]?re[-_]?hiring|"
    r"work[-_]?with[-_]?us|openings|job[-_]?opportunities|hiring)(?:$|[/_\-.])",
    re.I,
)
# Never a careers page, whatever job word the link also has: payroll and HR
# logins ("Employee Login" to Paycom's /ee/ or ADP's login.html, "Team Login",
# "Employee Portal", "Team Member Access"), and review or employment-verification
# pages. Checked on text and path. A bare "portal" or "payroll" is not enough:
# "Career Portal" and "Now hiring: Payroll Specialist" are careers links.
_NOT_CAREERS_RE = re.compile(
    r"(?:^|[^a-z])(?:log[\s_-]?(?:in|on)|sign[\s_-]?in|self[\s_-]?service|intranet|"
    r"(?:employees?|staff|team(?:[\s_-]+members?)?)[\s_-]+(?:portal|access|center|resources)|"
    r"pay[\s_-]?stubs?|time[\s_-]?clock|ee|reviews?|verification|verify)(?:$|[^a-z])",
    re.I,
)
# A contractor's portfolio ("Job Gallery", "Our Jobs", "Recent Jobs", "Job
# Pics", "Jobs We've Done", "Project Gallery") is about jobs done, not jobs
# open: never a same-site careers page, unless the text or path also clearly
# says hiring ("Now hiring: Project Manager", "Recent job openings", /careers/).
_PORTFOLIO_RE = re.compile(
    r"(?:^|[^a-z])(?:galler(?:y|ies)|photos?|pictures?|pics?|images?|videos?|showcase|portfolio|projects?|"
    r"completed|finished|done|recent|past|previous|our[\s_-]+(?:work|jobs)|before[\s_-]+(?:and|&)[\s_-]+after)"
    r"(?:$|[^a-z])",
    re.I,
)
_HIRING_RE = re.compile(
    r"(?:^|[^a-z])(?:careers?|employment|hiring|openings?|positions?|apply|applicants?|"
    r"join[\s_-]+our[\s_-]+team)(?:$|[^a-z])",
    re.I,
)
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
    return bool(_PATH_RE.search(path) or _PATH_RE.search(sub))


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
    out: List[str] = []
    for link in page.links:
        parts = urlsplit(link.url)
        host = (parts.hostname or "").lower()
        text, path = link.text or "", parts.path or ""
        if _page_key(link.url) == own or _NOT_CAREERS_RE.search(text) or _NOT_CAREERS_RE.search(path):
            continue
        if is_ats_host(host):
            if _ats_job_link(host, text, path) and link.url not in out:
                out.append(link.url)
            continue
        if normalize.registrable_domain(host) != site or (link.fragment and not _careers_page(host, path, site)):
            continue
        if ((_PORTFOLIO_RE.search(text) or _PORTFOLIO_RE.search(path))
                and not (_HIRING_RE.search(text) or _HIRING_RE.search(path))):
            continue
        if (_TEXT_RE.search(text) or _PATH_RE.search(path)
                or (_APPLY_RE.search(text) and (_JOB_WORD_RE.search(text) or _JOB_WORD_RE.search(path)))):
            if link.url not in out:
                out.append(link.url)
    return out


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
