"""Facebook and Instagram links a business publishes on its own website.

A link is kept as a candidate only when it points at a profile (not a share
button, tracking pixel, or the platform's own pages). ``matches`` says whether
the handle looks like this business (its name or its domain); a link that does
not match goes to review instead of the profile, because sites often link a
web designer's, a parent company's, or a sponsor's page.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List, Optional, Set, Tuple
from urllib.parse import parse_qs, unquote, urlsplit

from .. import normalize
from .html import Page

FACEBOOK_HOSTS = {"facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com",
                  "fb.com", "www.fb.com", "mobile.facebook.com", "business.facebook.com"}
INSTAGRAM_HOSTS = {"instagram.com", "www.instagram.com", "m.instagram.com"}

# First path segments that are never a business profile.
_FB_IGNORE = {
    "sharer", "sharer.php", "share", "share.php", "plugins", "tr", "dialog", "login", "login.php",
    "policies", "policy.php", "privacy", "help", "events", "photos", "photo", "photo.php", "watch",
    "hashtag", "p", "reel", "reels", "explore", "stories", "story.php", "home.php", "legal", "terms",
    "ads", "business", "gaming", "marketplace", "settings", "about", "careers", "notes", "video.php",
    "permalink.php", "l.php", "search", "facebook", "meta", "fb", "messages", "media", "pg", "places",
    "signup", "recover", "r.php", "v2.0", "v3.0", "dialog.php", "sharer", "badges", "directory",
    "pages_reaction_units", "posts", "public", "hashtags", "friends",
}
_IG_IGNORE = {
    "p", "reel", "reels", "explore", "stories", "tv", "accounts", "about", "developer", "legal",
    "direct", "instagram", "web", "emails", "press", "static", "privacy", "terms", "session",
    "challenge", "oauth", "embed.js", "sharer", "share", "tags",
}
_HANDLE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._\-]{0,79}$")


@dataclass(frozen=True)
class SocialCandidate:
    network: str      # 'facebook' | 'instagram'
    url: str          # https://www.facebook.com/<handle> or https://www.instagram.com/<handle>
    handle: str
    matches: bool
    reason: str       # name_token | domain_label | mismatch | group | numeric_profile


def _handle_tokens(handle: str) -> Set[str]:
    """'ExampleTire_Lube903' -> {'example', 'tire', 'lube'}."""
    spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", handle)
    spaced = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", spaced)
    return {t for t in re.split(r"[^a-z]+", spaced.lower()) if t}


def _domain_label(site_domain: Optional[str]) -> str:
    domain = normalize.registrable_domain(site_domain or "")
    return re.sub(r"[^a-z0-9]", "", domain.split(".")[0]) if domain else ""


def handle_matches(handle: str, business_name: str, site_domain: Optional[str]) -> Tuple[bool, str]:
    name = normalize.name_tokens(business_name)
    for token in _handle_tokens(handle):
        if len(token) >= 4 and token in name:
            return True, "name_token"
    label = _domain_label(site_domain)
    flat = re.sub(r"[^a-z]", "", handle.lower())
    flat_alnum = re.sub(r"[^a-z0-9]", "", handle.lower())
    if label and len(re.sub(r"[^a-z]", "", label)) >= 4 and label in flat_alnum:
        return True, "domain_label"
    if label and len(flat) >= 4 and flat_alnum in label:
        return True, "domain_label"
    return False, "mismatch"


def _facebook(url: str) -> Optional[Tuple[str, str, Optional[str]]]:
    """(canonical url, handle, forced reason) or None when not a profile."""
    parts = urlsplit(url)
    segments = [unquote(s) for s in parts.path.split("/") if s]
    if not segments:
        return None
    first = segments[0].lower()
    if first == "profile.php":
        ids = parse_qs(parts.query).get("id", [])
        if ids and ids[0].isdigit():
            return f"https://www.facebook.com/profile.php?id={ids[0]}", ids[0], "numeric_profile"
        return None
    if first == "groups":
        if len(segments) >= 2 and _HANDLE_RE.match(segments[1]):
            gid = segments[1].lower()
            return f"https://www.facebook.com/groups/{gid}", gid, "group"
        return None
    if first in ("pages", "people"):
        # /pages/<name>/<id> and /people/<name>/<id>: identified only by number.
        numeric = [s for s in segments[1:] if s.isdigit()]
        if numeric:
            return f"https://www.facebook.com/{numeric[-1]}", numeric[-1], "numeric_profile"
        return None
    if first == "pg" and len(segments) >= 2:
        segments = segments[1:]
        first = segments[0].lower()
    if first in _FB_IGNORE or first.endswith(".php") or not _HANDLE_RE.match(segments[0]):
        return None
    handle = segments[0]
    if handle.isdigit():
        return f"https://www.facebook.com/{handle}", handle, "numeric_profile"
    return f"https://www.facebook.com/{handle.lower()}", handle, None


def _instagram(url: str) -> Optional[Tuple[str, str, Optional[str]]]:
    parts = urlsplit(url)
    segments = [unquote(s) for s in parts.path.split("/") if s]
    if not segments:
        return None
    handle = segments[0]
    if handle.lower() in _IG_IGNORE or not re.fullmatch(r"[A-Za-z0-9._]{1,30}", handle):
        return None
    return f"https://www.instagram.com/{handle.lower()}", handle, None


def classify(url: str) -> Optional[Tuple[str, str, str, Optional[str]]]:
    """(network, canonical url, handle, forced reason) for a profile link, else None."""
    norm = normalize.norm_url(url)
    if not norm:
        return None
    host = (urlsplit(norm).hostname or "").lower()
    if host in FACEBOOK_HOSTS:
        hit = _facebook(norm)
        return ("facebook",) + hit if hit else None
    if host in INSTAGRAM_HOSTS:
        hit = _instagram(norm)
        return ("instagram",) + hit if hit else None
    return None


def _jsonld_same_as(page: Page) -> Iterable[str]:
    for item in page.jsonld:
        value = item.get("sameAs") if isinstance(item, dict) else None
        for entry in value if isinstance(value, list) else [value]:
            if isinstance(entry, str):
                yield entry


def social_links(page: Page, business_name: str, site_domain: Optional[str]) -> List[SocialCandidate]:
    out: List[SocialCandidate] = []
    seen: Set[str] = set()
    urls = [link.url for link in page.links] + list(_jsonld_same_as(page))
    for raw in urls:
        hit = classify(raw)
        if not hit:
            continue
        network, url, handle, forced = hit
        if url in seen:
            continue
        seen.add(url)
        if forced:
            matches, reason = False, forced
        else:
            matches, reason = handle_matches(handle, business_name, site_domain)
        out.append(SocialCandidate(network=network, url=url, handle=handle.lower(), matches=matches, reason=reason))
    return out
