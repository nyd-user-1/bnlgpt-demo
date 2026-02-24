"""
Scrape the ENDF Reports table from https://www.nndc.bnl.gov/endfdocs/
and output SQL INSERT statements for the endf_reports table.
"""

import urllib.request
import re
import json

URL = "https://www.nndc.bnl.gov/endfdocs/"

html = urllib.request.urlopen(URL).read().decode("utf-8", errors="replace")

# Find all table rows
rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.DOTALL)

reports = []
for row in rows:
    cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL)
    if len(cells) < 6:
        continue

    seq_raw = cells[0].strip()
    # Skip header row
    if not seq_raw.isdigit():
        continue

    seq_number = int(seq_raw)

    # Extract report number and PDF href
    report_cell = cells[1]
    href_match = re.search(r'href="([^"]*)"', report_cell)
    pdf_url = href_match.group(1) if href_match else ""
    if pdf_url and not pdf_url.startswith("http"):
        pdf_url = URL + pdf_url

    # Strip HTML tags for report number
    report_number = re.sub(r"<[^>]+>", "", report_cell).strip()

    # Authors
    authors = re.sub(r"<[^>]+>", "", cells[2]).strip()
    authors = re.sub(r"\s+", " ", authors)

    # Title
    title = re.sub(r"<[^>]+>", "", cells[3]).strip()
    title = re.sub(r"\s+", " ", title)

    # Date
    report_date = re.sub(r"<[^>]+>", "", cells[4]).strip()
    report_date = re.sub(r"\s+", " ", report_date)

    # Cross Reference
    cross_reference = re.sub(r"<[^>]+>", "", cells[5]).strip() if len(cells) > 5 else ""
    cross_reference = re.sub(r"\s+", " ", cross_reference)

    reports.append({
        "seq_number": seq_number,
        "report_number": report_number,
        "authors": authors,
        "title": title,
        "report_date": report_date,
        "cross_reference": cross_reference,
        "pdf_url": pdf_url,
    })

print(f"-- Scraped {len(reports)} ENDF reports")
print()

# Output as JSON for verification
with open("/Users/brendanstanton/bnlgpt/scripts/endf-reports.json", "w") as f:
    json.dump(reports, f, indent=2)

print(f"Wrote {len(reports)} reports to scripts/endf-reports.json")

# Also output SQL
def esc(s):
    return s.replace("'", "''") if s else ""

print()
print("-- SQL INSERT statements")
print("INSERT INTO endf_reports (seq_number, report_number, authors, title, report_date, cross_reference, pdf_url) VALUES")
lines = []
for r in reports:
    lines.append(
        f"  ({r['seq_number']}, '{esc(r['report_number'])}', '{esc(r['authors'])}', "
        f"'{esc(r['title'])}', '{esc(r['report_date'])}', '{esc(r['cross_reference'])}', "
        f"'{esc(r['pdf_url'])}')"
    )
print(",\n".join(lines) + ";")
