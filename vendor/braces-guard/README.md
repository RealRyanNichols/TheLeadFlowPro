# @leadflow/braces-guard

Private, locally vendored MIT-licensed compatibility fork of **braces 3.0.3**.
This is version **0.1.0 of a different package**, not an upstream patched release.

The official [GHSA-vfj7-8cjw-p6xm advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
reported no patched braces release when checked October 3, 2026. The existing
10,000-character cap allows thousands of nested braces; recursive compile and
expand then exhaust the JavaScript call stack.

## Scope of the change

- Retain the original callable CommonJS API, parse/stringify/compile/expand/create
  methods, escaping/quotes/character classes, and fill-range dependency.
- Bound actual parser node depth at 128 (braces and parentheses), using its own
  syntax decisions rather than a raw character count. Literal or escaped braces
  do not consume structural depth. Bound parser node count and pattern list size.
- Before compile, expand, or stringify walks either a parsed or directly supplied
  AST, iteratively check child-path depth, cycles, parent-chain cycles/depth, and
  a 16,384-visit budget. Normal parsed AST parent/prev references are preserved.
- AST text values must be strings, each at most the upstream 10,000-character
  input cap, with at most 1 MiB of total visited UTF-8 text. Accessor/proxy objects are
  executable caller code and are outside the plain-data AST threat model.
- Guards also protect direct `braces/lib/compile`, `expand`, and `stringify`
  imports. Caller options cannot disable or increase these guard limits.
- Keep the 10,000-character input cap even with NaN/Infinity caller limits.
- Bound expansion to 10,000 outputs and 1 MiB total output UTF-8 text. Check Cartesian
  products and numeric/character ranges before allocation; safe integer endpoints
  prevent a non-progressing fill-range loop. Stepped regex compilation is also
  bounded, while normal compact range regexes remain supported; enforce the
  cumulative 1 MiB UTF-8 compiled-output budget before joining child results; also bound flattening
  and aggregate pattern-list results. Every retained expansion queue addition
  enforces cumulative output count/text, including sibling comma alternatives. Caller `rangeLimit` restrictions still apply.
- Remove an upstream compile debug log that could print AST values.

Limits deliberately reject unusually deep, broad or expansive patterns/ASTs before
recursive work or large Cartesian allocation. This is a compatibility restriction
for pathological input. Upstream `rangeLimit` can lower the range budget, but cannot
disable the independent hard output caps. Executable caller callbacks are outside
the plain-data input threat model.

## Provenance and maintenance

`UPSTREAM.json` records source, original registry integrity, and SHA-256 hashes
of the files copied from the locked registry package. Original copyright and MIT
license remain in `LICENSE`. `lib/guard.js` and the small guard insertions are the
local security delta; no install scripts or downloaded runtime patches exist.

The root devDependency `braces` points to this checked-in package, and npm
`overrides.braces: "$braces"` resolves dependent imports to that same root spec. Audit sees the explicitly named fork, whose safety is supported by the
reviewable implementation and adversarial tests, not by a fabricated braces
version or an ignored advisory. Reassess the override when upstream publishes a
real fixed compatible release. Do not raise the guard limits to satisfy a build
without reviewing the affected pattern and the regression tests.

Validation: `node --experimental-strip-types --no-warnings --import
./scripts/register-ts.mjs --test tests/braces-guard.test.ts`; `npm ci`;
`npm audit --audit-level=high`; the normal full tests and production build.
