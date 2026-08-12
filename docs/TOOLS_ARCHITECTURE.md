# Tools architecture

The free tool library. One engine, one registry, one page shell, many tools.

## The shape of it

```
lib/tools/
  types.ts        ToolDef (what a tool file authors), Tool (what the app consumes),
                  Field, Result, Preset, ToolMeta, formatting helpers
  taxonomy.ts     domains, tool types, goals, industries, audiences, disclaimers
  art.ts          the SVG artwork generator, shared by the script and the OG route
  search.ts       query resolution, synonyms, typo tolerance, scoring
  collections.ts  curated collections and the collection route data
  validate.ts     the rules that fail the build
  index.ts        merges definitions + metadata + art into TOOLS
  meta/           taxonomy for the original 78, one file per source file
  batches/        tools added since, one file per collection
  leads|money|operations|growth|generators.ts   the original 78 formulas
  new.ts          aggregates lib/tools/batches/*
```

A tool is data. Fields go in, a pure `run()` comes out. There is no per-tool page
component, which is what keeps tool number 250 behaving exactly like tool number
one.

## Two types, on purpose

- **`ToolDef`** is what you author. Taxonomy fields are optional on it.
- **`Tool`** is what pages, search, the sitemap and the OG route consume. Taxonomy,
  artwork, publication status and the prebuilt search blob are all guaranteed.

`lib/tools/index.ts` turns the first into the second. Consumers never guard for a
missing field, and validation catches anything that did not get filled in.

## Adding a tool

1. Pick the batch file in `lib/tools/batches/`, or add one and import it in
   `lib/tools/new.ts`.
2. Append a `ToolDef` object. Author the taxonomy inline.
3. Run `npm run validate:tools`. It will tell you exactly what is missing.
4. Write a known-value test in `tests/formulas.test.ts`. A calculator without a
   verified expected output is not finished.
5. Run `npm run art` to draw its card and hero artwork.
6. Set `status: "published"` last, once the other five steps pass.

### The fields

| Field | Required | Notes |
| --- | --- | --- |
| `slug` | yes | lowercase, hyphenated, permanent. Changing one breaks a live URL. |
| `name` | yes | what it is called on the page and in search |
| `short` | no | for tight card space |
| `emoji` | yes | a minor label accent only, never the artwork |
| `category` | yes | one of the original eight, kept as a secondary label |
| `tagline` | yes | one line, under about 60 characters |
| `description` | yes | plain language, 60 characters or more |
| `who` / `problem` / `payoff` | yes | the three cards under the tool |
| `steps` | yes | two or more. These render as visible instructions and as HowTo schema. |
| `faqs` | no | render as visible FAQs and as FAQPage schema. Only real questions. |
| `fields` | yes | the inputs |
| `run` | yes | pure function, no side effects, never throws |
| `domain` | yes | exactly one, from `taxonomy.ts` |
| `toolType` | yes | exactly one |
| `goals` | yes | one or more |
| `industries` | yes | one or more. Be generous but honest. |
| `audiences` | yes | one or more |
| `keywords` | yes | three or more, words that are not already in the name |
| `synonyms` | no | other names for the same thing |
| `disclaimer` | yes | one of the disclaimer types |
| `dataSensitivity` | yes | `none`, `personal` or `sensitive` |
| `popularity` | yes | 0 to 100, hand ranked, drives the default sort |
| `presets` | no | industry presets, see below |
| `assumptions` | no | what the math took for granted, always shown |
| `relatedSlugs` | no | overrides the automatic picker |
| `status` | no | defaults to `published` |

### Industry presets

One formula, many industries. A preset changes the starting numbers, the example
line and the collection the tool shows up in. It never changes the math. This is
what stops the library turning into fifteen near-identical missed-call pages.

```ts
presets: [
  {
    id: "dental",
    label: "Dental office",
    industry: "dental-practice",
    blurb: "Steady call volume and a patient who comes back twice a year.",
    values: { missed: 8, closeRate: 40, ticket: 450, repeats: 6 },
    example: "Eight missed calls a week at a 450 dollar average visit.",
  },
]
```

Every key in `values` has to be a real field id, sliders have to land inside their
range, and selects have to be one of their options. Validation checks all three.

### Results that explain themselves

`run()` returns a `Result`. A big number on its own is not an answer, so use:

- `headline` for the one number they came for
- `explain` for what that number means, written from the values they entered
- `verdict` for what to do about it
- `assumptions` for what the math took for granted

## Publication status

Only `published` tools are routable, in the sitemap, in search, or in the
directory. Everything else is tracked in `docs/TOOLS_ROADMAP.md` and is invisible
to the public site. There are no placeholder pages, ever.

Statuses: `proposed`, `formula-review`, `implementation`, `image-needed`, `qa`,
`ready`, `published`.

## Validation

`npm run validate:tools` runs before every build. It fails on:

- duplicate or malformed slugs
- missing or unknown taxonomy values
- fewer than three keywords, missing instructions, thin descriptions
- sliders whose default sits outside their range, selects with no matching default
- presets that set a field that does not exist
- `relatedSlugs` pointing at a tool that is not published
- a formula that throws, returns nothing, or produces `NaN` at default, minimum or
  maximum inputs
- em dashes, banned filler phrases and unsupported claims in public copy

## Copy rules, enforced

No em dashes. No "in today's digital landscape", "unlock your potential", "game
changer", "seamless solutions", "robust framework", "tailored strategies",
"elevate your brand". No guarantees about leads, revenue, rankings or
conversions. The validator checks for these so nobody has to remember them.

## Where the rest is documented

- `docs/TOOLS_ROADMAP.md` — what is published and what is still open
- `docs/TOOL_FORMULA_SOURCES.md` — where each formula comes from
- `docs/TOOL_IMAGE_SOURCES.md` — the artwork system and its licence position
- `docs/TOOLS_SEO.md` — metadata, structured data, sitemap, collections
- `docs/TOOLS_EMBEDDING.md` — the embed route and host compatibility
- `docs/TOOLS_ACCESSIBILITY.md` — the WCAG 2.2 AA position and how it is checked
- `docs/TOOLS_ANALYTICS.md` — the event taxonomy and the privacy rules
