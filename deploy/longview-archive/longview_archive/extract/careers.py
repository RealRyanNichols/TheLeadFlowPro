"""Careers pages and the front-office roles a business says it is hiring for.

``careers_links`` finds the site's own careers/jobs pages and links to
well-known applicant-tracking hosts; the archive stores those URLs but never
fetches the tracking hosts. ``roles_on_page`` is meant for a careers page and
flags only the five roles the directory's hiring view knows about.
"""

from __future__ import annotations

import re
from typing import List
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
    r"we\s+are\s+hiring|work\s+with\s+us|openings|apply\s+now|job\s+opportunities|job\s+openings)\b",
    re.I,
)
_PATH_RE = re.compile(
    r"(?:^|[/_\-.])(?:careers?|jobs?|employment|join[-_]?our[-_]?team|now[-_]?hiring|we[-_]?re[-_]?hiring|"
    r"work[-_]?with[-_]?us|openings|job[-_]?opportunities|hiring)(?:$|[/_\-.])",
    re.I,
)


def is_ats_host(host: str) -> bool:
    host = (host or "").lower().rstrip(".")
    return any(host == ats or host.endswith("." + ats) for ats in ATS_HOSTS)


def careers_links(page: Page) -> List[str]:
    """Same-site careers pages and applicant-tracking links, in page order."""
    site = normalize.registrable_domain(page.url)
    out: List[str] = []
    for link in page.links:
        parts = urlsplit(link.url)
        host = (parts.hostname or "").lower()
        if is_ats_host(host):
            if link.url not in out:
                out.append(link.url)
            continue
        if normalize.registrable_domain(host) != site:
            continue
        if _TEXT_RE.search(link.text or "") or _PATH_RE.search(parts.path or ""):
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
