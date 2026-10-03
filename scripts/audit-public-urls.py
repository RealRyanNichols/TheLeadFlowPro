#!/usr/bin/env python3
"""Bounded, read-only public HTML audit; no browser, API, account or form requests.

python3 scripts/audit-public-urls.py --output /absolute/path/audit.json \
  --inventory /absolute/path/source-inventory.json
Queries are never requested or retained. Redirects are checked before following.
A 429 stops scheduling new work; no automatic retries. Only public HTML paths
are fetched, with at most four concurrent requests and a 3 MiB response cap.
"""
import argparse
import concurrent.futures
import datetime
from html.parser import HTMLParser
import json
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET

MAX_BYTES = 3 * 1024 * 1024
EXCLUDED_PREFIXES = (
    '/api', '/admin', '/sales', '/dashboard', '/hq', '/account', '/auth',
    '/design-preview', '/factory', '/embed', '/deposit', '/checkout', '/r', '/community',
)
EXCLUDED_PATHS = {
    '/login', '/logout', '/unsubscribe', '/unsubscribed', '/thank-you', '/request', '/unlock', '/backend',
    '/agency/pay', '/agency/paid', '/agency/start', '/tools/pro/unlock',
    '/chase-sheet/app', '/post-creator/app', '/go/tools/manage', '/tools/og-gallery',
    '/go/lead-follow-up/intake', '/go/time-back/welcome', '/go/tools/welcome',
    '/chatgpt/welcome', '/academy/welcome', '/september-special/confirmation',
    '/operator-academy/content-engine/welcome',
}
ASSET_EXTENSION = re.compile(r'\.(?:pdf|png|jpe?g|webp|svg|gif|ico|mp4|webm|mp3|wav|zip|json|xml|txt|webmanifest|woff2?|css|js)$', re.I)


def exclusion(path):
    for _ in range(3):
        decoded = urllib.parse.unquote(path)
        if decoded == path: break
        path = decoded
    if '%' in path or '\\' in path or any(s in ('.', '..') for s in path.split('/')):
        return 'encoded or ambiguous path'
    if any(path == p or path.startswith(p + '/') for p in EXCLUDED_PREFIXES):
        return 'protected/API/preview/embed/payment surface'
    if path in EXCLUDED_PATHS:
        return 'account/payment/intake/completion/unsubscribe surface'
    if re.match(r'^/training/[^/]+/.+', path):
        return 'gated lesson, exam or credential'
    if re.match(r'^/scoreboard/[^/]+/owner(?:/|$)', path):
        return 'owner surface'
    if re.match(r'^/events/[^/]+/(?:thanks|confirmed|worksheet)(?:/|$)', path):
        return 'attendee/payment/completion surface'
    if ASSET_EXTENSION.search(path) or path.startswith('/_next/'):
        return 'asset (HTML crawl only)'
    return None


def normalize(href, base, origin):
    """Keep only safe same-origin public paths. Never retain query values."""
    try:
        url = urllib.parse.urlsplit(urllib.parse.urljoin(base, href))
        root = urllib.parse.urlsplit(origin)
        if url.scheme not in ('http', 'https') or url.netloc != root.netloc:
            return None
        path = url.path or '/'
        # Normalizing encoded slashes/dot paths before policy checks avoids
        # discovering a protected endpoint through an encoded link.
        decoded = urllib.parse.unquote(path)
        if '\\' in decoded or any(s in ('.', '..') for s in decoded.split('/')):
            return None
        if exclusion(path):
            return None
        return {'url': origin + path, 'fragment': urllib.parse.unquote(url.fragment), 'hadQuery': bool(url.query)}
    except (ValueError, TypeError):
        return None


class PublicHtml(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titles, self.descriptions, self.robots, self.canonicals = [], [], [], []
        self.h1, self.ids, self.links, self.schema, self.schema_errors = [], set(), [], [], []
        self._title, self._h1, self._schema = None, None, None
        self._svg_depth = 0
        self.open_graph = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'svg': self._svg_depth += 1
        if attrs.get('id'): self.ids.add(attrs['id'])
        if tag == 'a':
            if attrs.get('name'): self.ids.add(attrs['name'])
            if 'href' in attrs: self.links.append(attrs['href'])
        if tag == 'title' and not self._svg_depth: self._title = []
        if tag == 'h1': self._h1 = []
        if tag == 'meta':
            name = attrs.get('name', '').lower()
            value = attrs.get('content', '')
            if name == 'description': self.descriptions.append(value)
            if name in ('robots', 'googlebot'): self.robots.append(value)
            if attrs.get('property', '').startswith('og:'):
                self.open_graph.setdefault(attrs['property'], []).append(value)
        if tag == 'link' and 'canonical' in attrs.get('rel', '').lower().split():
            self.canonicals.append(attrs.get('href', ''))
        if tag == 'script' and attrs.get('type', '').lower() == 'application/ld+json':
            self._schema = []

    def handle_data(self, data):
        if self._title is not None: self._title.append(data)
        if self._h1 is not None: self._h1.append(data)
        if self._schema is not None: self._schema.append(data)

    def handle_endtag(self, tag):
        if tag == 'svg': self._svg_depth = max(0, self._svg_depth - 1)
        if tag == 'title' and not self._svg_depth and self._title is not None:
            self.titles.append(''.join(self._title).strip()); self._title = None
        if tag == 'h1' and self._h1 is not None:
            self.h1.append(' '.join(''.join(self._h1).split())); self._h1 = None
        if tag == 'script' and self._schema is not None:
            try: self.schema.append(json.loads(''.join(self._schema)))
            except (ValueError, TypeError): self.schema_errors.append('Invalid JSON-LD')
            self._schema = None


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read_response(url):
    request = urllib.request.Request(url, headers={
        'User-Agent': 'LeadFlow-Public-URL-Audit/1.0 (read-only; four requests maximum)',
        'Accept': 'text/html,application/xml,text/plain;q=0.8',
    })
    opener = urllib.request.build_opener(NoRedirect, urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    try: response = opener.open(request, timeout=20)
    except urllib.error.HTTPError as error: response = error
    with response:
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES: raise ValueError('Response exceeds 3 MiB audit limit')
        return response.status, dict(response.headers), body.decode('utf-8', errors='replace')


def crawl_page(url, origin):
    result = {'url': url, 'redirects': [], 'status': None, 'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    current = url
    started = time.monotonic()
    try:
        for _ in range(6):
            status, headers, body = read_response(current)
            result['status'] = status
            if status == 429:
                result['rateLimited'] = True
                result['retryAfter'] = headers.get('Retry-After')
                break
            if status in (301, 302, 303, 307, 308):
                location = headers.get('Location')
                target = normalize(location, current, origin) if location else None
                result['redirects'].append({'from': current, 'status': status, 'to': target['url'] if target else '[excluded or external]'})
                if not target:
                    result['redirectExcluded'] = True
                    break
                current = target['url']
                continue
            result['finalUrl'] = current
            result['contentType'] = headers.get('Content-Type', '')
            result['xRobotsTag'] = headers.get('X-Robots-Tag', '')
            if 'text/html' not in result['contentType']: break
            parsed = PublicHtml(); parsed.feed(body); parsed.close()
            result.update(titles=parsed.titles, descriptions=parsed.descriptions,
                robots=parsed.robots, canonicals=parsed.canonicals, h1=parsed.h1,
                ids=sorted(parsed.ids), links=parsed.links, schema=parsed.schema, openGraph=parsed.open_graph,
                schemaErrors=parsed.schema_errors)
            break
        else: result['error'] = 'Redirect chain exceeds five hops'
    except Exception as error:
        result['error'] = str(error)
    result['elapsedMs'] = round((time.monotonic() - started) * 1000)
    return result


def schema_types(value):
    out = []
    if isinstance(value, dict):
        types = value.get('@type', [])
        if isinstance(types, str): types = [types]
        out.extend(types)
        for v in value.values(): out.extend(schema_types(v))
    elif isinstance(value, list):
        for v in value: out.extend(schema_types(v))
    return sorted(set(out))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--origin', default='https://www.theleadflowpro.com')
    ap.add_argument('--output', required=True)
    ap.add_argument('--inventory')
    ap.add_argument('--reuse', help='Reuse a previous bounded audit and refresh explicitly selected public paths')
    ap.add_argument('--refresh', action='append', default=[], help='Public path to recheck when --reuse is supplied')
    ap.add_argument('--max-pages', type=int, default=500)
    ap.add_argument('--workers', type=int, choices=range(1, 5), default=4)
    args = ap.parse_args()
    origin = args.origin.rstrip('/')
    if urllib.parse.urlsplit(origin).path: ap.error('origin must not contain a path')
    if not 1 <= args.max_pages <= 1000: ap.error('max-pages must be 1–1000')
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    robots_status, _, robots = read_response(origin + '/robots.txt')
    sitemap_status, _, xml = read_response(origin + '/sitemap.xml')
    if robots_status != 200 or sitemap_status != 200: raise RuntimeError('robots/sitemap must both respond 200 before crawl')
    sitemap = [n.text for n in ET.fromstring(xml).findall('{*}url/{*}loc') if n.text]
    inventory = json.load(open(args.inventory)) if args.inventory else {}
    static_routes = [r for r in inventory.get('routeTemplates', []) if '[' not in r]
    previous = json.load(open(args.reuse)) if args.reuse else {}
    if previous and previous.get('origin') != origin: ap.error('reuse origin must match')
    seeds = [origin + p for p in args.refresh] if args.reuse else sitemap + [origin + r for r in static_routes]
    pending, scheduled, results, excluded = [], set(), {}, {}
    for row in previous.get('results', []):
        normalized = normalize(row['url'], origin, origin)
        if normalized:
            row['url'] = normalized['url']
            results[row['url']] = row
            scheduled.add(row['url'])
    for item in previous.get('excluded', []): excluded[item['path']] = item['reason']
    robots_policy = urllib.robotparser.RobotFileParser()
    robots_policy.parse(robots.splitlines())
    for seed in seeds:
        normalized = normalize(seed, origin, origin)
        if normalized and (normalized['url'] not in scheduled or args.reuse):
            if robots_policy.can_fetch('LeadFlow-Public-URL-Audit', normalized['url']):
                scheduled.add(normalized['url']); pending.append(normalized['url'])
            else: excluded[urllib.parse.urlsplit(seed).path] = 'robots disallow'
        elif not normalized:
            path = urllib.parse.urlsplit(seed).path
            excluded[path] = exclusion(path) or 'external or invalid'
    incoming = {k: set(v) for k, v in previous.get('internalIncoming', {}).items()}
    missing_anchors = previous.get('samePageMissingAnchors', [])
    query_links = previous.get('queryLinksNotRequested', 0)
    fetched = 0
    rate_limited = False
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        while pending and fetched < args.max_pages and not rate_limited:
            batch = pending[:min(args.workers, args.max_pages - fetched)]
            del pending[:len(batch)]
            for row in pool.map(lambda url: crawl_page(url, origin), batch):
                results[row['url']] = row
                fetched += 1
                if row.get('rateLimited'): rate_limited = True
                for href in row.pop('links', []):
                    normalized = normalize(href, row.get('finalUrl', row['url']), origin)
                    if not normalized:
                        parsed = urllib.parse.urlsplit(urllib.parse.urljoin(row['url'], href))
                        if parsed.netloc == urllib.parse.urlsplit(origin).netloc:
                            excluded[parsed.path] = exclusion(parsed.path) or 'invalid path'
                        continue
                    target = normalized['url']
                    query_links += int(normalized['hadQuery'])
                    incoming.setdefault(target, set()).add(row['url'])
                    if normalized['fragment'] and target == row.get('finalUrl', row['url']) and normalized['fragment'] not in row.get('ids', []):
                        missing_anchors.append({'from': row['url'], 'target': target, 'fragment': normalized['fragment']})
                    if not args.reuse and target not in scheduled:
                        if robots_policy.can_fetch('LeadFlow-Public-URL-Audit', target):
                            scheduled.add(target); pending.append(target)
                        else: excluded[urllib.parse.urlsplit(target).path] = 'robots disallow'
                row['schemaTypes'] = schema_types(row.pop('schema', []))
    issues = []
    sitemap_set = {normalize(u, origin, origin)['url'] for u in sitemap if normalize(u, origin, origin)}
    for url, row in results.items():
        codes = []
        if row.get('error'): codes.append('fetch_error')
        if row['status'] != 200: codes.append('non_200')
        if row.get('redirects') and url in sitemap_set: codes.append('sitemap_redirect')
        indexable = 'noindex' not in ','.join(row.get('robots', []) + [row.get('xRobotsTag', '')]).lower()
        row['indexable'] = indexable
        if url in sitemap_set and not indexable: codes.append('sitemap_noindex')
        if 'text/html' not in row.get('contentType', '') or not indexable:
            if codes: issues.append({'url': url, 'codes': codes})
            continue
        if not row.get('titles') or not row['titles'][0]: codes.append('missing_title')
        elif len(row['titles']) != 1: codes.append('multiple_titles')
        if not row.get('descriptions') or not row['descriptions'][0]: codes.append('missing_description')
        elif len(row['descriptions']) != 1: codes.append('multiple_descriptions')
        if not row.get('h1'): codes.append('missing_h1')
        elif len(row['h1']) != 1: codes.append('multiple_h1')
        if len(row.get('canonicals', [])) != 1: codes.append('missing_or_multiple_canonical')
        elif indexable and row['canonicals'][0].rstrip('/') != row.get('finalUrl', url).rstrip('/'): codes.append('canonical_mismatch')
        if row.get('schemaErrors'): codes.append('invalid_jsonld')
        if codes: issues.append({'url': url, 'codes': codes})
    duplicates = {}
    for field in ('titles', 'descriptions', 'canonicals'):
        grouped = {}
        for url, row in results.items():
            if row['status'] == 200 and row.get('indexable') and not row.get('redirects') and row.get(field):
                grouped.setdefault(row[field][0], []).append(url)
        duplicates[field] = [{'value': k, 'urls': v} for k, v in grouped.items() if len(v) > 1]
    output = {'startedAt': started, 'completedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'origin': origin, 'sourceRevision': inventory.get('revision'),
        'limits': {'workers': args.workers, 'maxPages': args.max_pages, 'maxResponseBytes': MAX_BYTES, 'retries': 0},
        'sitemap': sitemap, 'sitemapFetchedAt': started, 'reusedAudit': bool(args.reuse), 'requestsThisPass': fetched, 'robots': robots, 'routeTemplates': inventory.get('routeTemplates', []),
        'excluded': [{'path': k, 'reason': v} for k, v in sorted(excluded.items())],
        'remaining': pending, 'rateLimited': rate_limited, 'queryLinksNotRequested': query_links,
        'results': list(results.values()), 'issues': issues, 'duplicates': duplicates,
        'samePageMissingAnchors': missing_anchors,
        'sitemapWithoutObservedInternalIncoming': sorted(sitemap_set - set(incoming)),
        'internalIncoming': {k: sorted(v) for k, v in sorted(incoming.items())},
        'sitemapDuplicates': sorted({u for u in sitemap if sitemap.count(u) > 1})}
    with open(args.output, 'w') as f: json.dump(output, f, indent=2)
    print(json.dumps({'crawled': len(results), 'sitemap': len(sitemap), 'issues': len(issues),
        'samePageMissingAnchors': len(missing_anchors), 'remaining': len(pending), 'rateLimited': rate_limited}))


if __name__ == '__main__': main()
