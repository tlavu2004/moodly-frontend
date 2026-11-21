import os
import re
import subprocess
from collections import defaultdict
from pathlib import Path

REPORT = Path("coverage/lcov.info")


def coverage_rows(changes):
    line_hits = {}
    branch_hits = {}
    changed = ()
    with REPORT.open(encoding="utf-8") as report:
        for record in report:
            key, _, value = record.rstrip("\r\n").partition(":")
            if key == "SF":
                path = Path(value.replace("\\", "/")).resolve()
                try:
                    path = path.relative_to(Path.cwd()).as_posix()
                except ValueError:
                    path = ""
                changed = changes.get(path, ())
                line_hits.clear()
                branch_hits.clear()
            elif key == "DA":
                number, hits, *_ = value.split(",")
                if int(number) in changed:
                    line_hits[int(number)] = int(hits) > 0
            elif key == "BRDA":
                number, _, _, hits = value.split(",")
                number = int(number)
                if number in changed:
                    branch_hits.setdefault(number, []).append(hits != "-" and int(hits) > 0)
            elif key == "end_of_record":
                for number, hit in line_hits.items():
                    branches = branch_hits.get(number, ())
                    yield hit, sum(branches), len(branches)


HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")


def changed_lines(base):
    diff = subprocess.check_output(
        ["git", "-c", "core.quotePath=false", "diff", "--no-ext-diff", "--no-color",
         "--find-renames", "--unified=0", "--dst-prefix=b/", f"{base}...HEAD", "--"],
        encoding="utf-8",
    )
    files = defaultdict(set)
    path = None
    in_header = False
    for line in diff.splitlines():
        if line.startswith("diff --git "):
            path = None
            in_header = True
        elif in_header and line.startswith("+++ b/"):
            path = line[6:].split("\t", 1)[0]
            in_header = False
        elif path and (match := HUNK.match(line)):
            start = int(match[1])
            count = 1 if match[2] is None else int(match[2])
            files[path].update(range(start, start + count))
    return files


def main():
    lines = ["## Coverage on changed lines", "",
             "Advisory. Counts include changed source lines present in the coverage report.", ""]
    if not REPORT.is_file():
        lines.append("Coverage report unavailable.")
    else:
        changes = changed_lines(os.environ["PR_BASE_SHA"])
        coverage = list(coverage_rows(changes))
        lines.extend(["| Metric | Covered | Total | Coverage | Target | Result |",
                      "| --- | ---: | ---: | ---: | ---: | --- |"])
        for name, target, covered, total in (
            ("LINE", 85, sum(row[0] for row in coverage), len(coverage)),
            ("BRANCH", 75, sum(row[1] for row in coverage), sum(row[2] for row in coverage)),
        ):
            percent = f"{covered / total:.2%}" if total else "N/A"
            result = "N/A" if not total else ("Pass" if covered * 100 >= target * total else "Below target")
            lines.append(f"| {name} | {covered} | {total} | {percent} | {target}% | {result} |")
    summary = "\n".join(lines) + "\n"
    print(summary, end="")
    with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as output:
        output.write(summary)


if __name__ == "__main__":
    main()
