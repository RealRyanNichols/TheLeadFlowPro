#!/usr/bin/env python3
"""Regenerate the Operator Academy lesson migration from content/academy/*.md.

Source of truth for lesson bodies is content/academy/<course-slug>/<NN>-<lesson-slug>.md.
This writes one SQL file of UPDATE statements (dollar-quoted, safe for any markdown)
that sets lessons.content for every file found. Apply it with the Supabase MCP,
`supabase db push`, or psql. Idempotent: re-running only rewrites the same rows.

  python3 scripts/generate-academy-lessons-migration.py [out.sql]
"""
import glob, os, re, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "content", "academy")

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        ROOT, "supabase", "migrations",
        datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_operator_academy_lessons.sql")
    parts = [
        "-- Operator Academy lesson content. Generated from content/academy/*.md by",
        "-- scripts/generate-academy-lessons-migration.py. Edit the markdown, not this file.",
        "", "begin;", "",
    ]
    total = 0
    for course in sorted(os.listdir(BASE)):
        folder = os.path.join(BASE, course)
        if not os.path.isdir(folder):
            continue
        for path in sorted(glob.glob(os.path.join(folder, "[0-9][0-9]-*.md"))):
            slug = re.match(r"\d\d-(.+)\.md$", os.path.basename(path)).group(1)
            text = open(path, encoding="utf-8").read().strip() + "\n"
            if "$lesson$" in text:
                raise SystemExit(f"{path}: contains the $lesson$ delimiter")
            parts.append(
                f"update public.lessons l set content = $lesson${text}$lesson$\n"
                f"from public.courses c where c.id = l.course_id and c.slug = '{course}' and l.slug = '{slug}';\n"
            )
            total += 1
    parts += ["commit;", ""]
    open(out, "w", encoding="utf-8").write("\n".join(parts))
    print(f"{total} lessons -> {out}")

if __name__ == "__main__":
    main()
