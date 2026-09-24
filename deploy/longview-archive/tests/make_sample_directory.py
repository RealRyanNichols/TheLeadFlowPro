"""Write a fictional sample publish export, for trying the directory pages locally.

    python3 tests/make_sample_directory.py OUT.json

It runs the same offline pipeline as tests/test_end_to_end.py (fixture open
data and fixture websites under tests/fixtures/e2e/; every business, phone,
and domain is fictional; nothing touches the network) and writes the export
with ``"sample": true``, so the site shows its sample banner and
``npm run validate:directory`` refuses to ship it. It will not write anywhere
inside content/longview-directory/, where only real, reviewed batches belong.
"""

from __future__ import annotations

import logging
import sys
import tempfile
from pathlib import Path
from typing import List, Optional

ENGINE = Path(__file__).resolve().parents[1]
if str(ENGINE) not in sys.path:
    sys.path.insert(0, str(ENGINE))

USAGE = "usage: python3 tests/make_sample_directory.py OUT.json"


def inside_committed_directory(path: Path) -> bool:
    """True when ``path`` is at or under any content/longview-directory/ folder."""
    resolved = Path(path).expanduser().resolve()
    return any(p.name == "longview-directory" and p.parent.name == "content"
               for p in (resolved, *resolved.parents))


def main(argv: Optional[List[str]] = None) -> int:
    args = sys.argv[1:] if argv is None else list(argv)
    if len(args) != 1 or args[0] in ("-h", "--help"):
        print(USAGE, file=sys.stderr)
        return 2
    out = Path(args[0])
    if inside_committed_directory(out):
        print("refusing to write a sample inside content/longview-directory/: that folder holds only"
              " real batches that went through review. Pick another path.", file=sys.stderr)
        return 2
    if out.exists() and out.is_dir():
        print(f"{out} is a directory; give a file path such as sample-directory.json", file=sys.stderr)
        return 2

    from longview_archive import publish
    from tests.fixtures.e2e import pipeline

    with tempfile.TemporaryDirectory(prefix="lva-sample-") as tmp:
        run = pipeline.run_pipeline(Path(tmp) / "data")
        try:
            data = run.export()
        finally:
            run.conn.close()
    data["sample"] = True
    publish.write_export(out, data)
    print(f"wrote a sample export ({len(data['businesses'])} fictional businesses, sample: true) to {out}")
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.ERROR, format="%(levelname)s %(name)s: %(message)s")
    sys.exit(main())
