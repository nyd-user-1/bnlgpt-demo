#!/usr/bin/env python3
"""
Parse the `keywords` column of every NSR record and populate
the structured columns: nuclides, reactions, z_values.

Usage:
    pip install supabase python-dotenv
    python scripts/parse-keywords.py

Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
(or a .env.local file in the project root).
"""

import os
import re
import sys
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client

# ---------------------------------------------------------------------------
# Element → Z lookup
# ---------------------------------------------------------------------------
ELEMENT_Z: dict[str, int] = {
    "H": 1, "He": 2, "Li": 3, "Be": 4, "B": 5, "C": 6, "N": 7, "O": 8,
    "F": 9, "Ne": 10, "Na": 11, "Mg": 12, "Al": 13, "Si": 14, "P": 15,
    "S": 16, "Cl": 17, "Ar": 18, "K": 19, "Ca": 20, "Sc": 21, "Ti": 22,
    "V": 23, "Cr": 24, "Mn": 25, "Fe": 26, "Co": 27, "Ni": 28, "Cu": 29,
    "Zn": 30, "Ga": 31, "Ge": 32, "As": 33, "Se": 34, "Br": 35, "Kr": 36,
    "Rb": 37, "Sr": 38, "Y": 39, "Zr": 40, "Nb": 41, "Mo": 42, "Tc": 43,
    "Ru": 44, "Rh": 45, "Pd": 46, "Ag": 47, "Cd": 48, "In": 49, "Sn": 50,
    "Sb": 51, "Te": 52, "I": 53, "Xe": 54, "Cs": 55, "Ba": 56, "La": 57,
    "Ce": 58, "Pr": 59, "Nd": 60, "Pm": 61, "Sm": 62, "Eu": 63, "Gd": 64,
    "Tb": 65, "Dy": 66, "Ho": 67, "Er": 68, "Tm": 69, "Yb": 70, "Lu": 71,
    "Hf": 72, "Ta": 73, "W": 74, "Re": 75, "Os": 76, "Ir": 77, "Pt": 78,
    "Au": 79, "Hg": 80, "Tl": 81, "Pb": 82, "Bi": 83, "Po": 84, "At": 85,
    "Rn": 86, "Fr": 87, "Ra": 88, "Ac": 89, "Th": 90, "Pa": 91, "U": 92,
    "Np": 93, "Pu": 94, "Am": 95, "Cm": 96, "Bk": 97, "Cf": 98, "Es": 99,
    "Fm": 100, "Md": 101, "No": 102, "Lr": 103, "Rf": 104, "Db": 105,
    "Sg": 106, "Bh": 107, "Hs": 108, "Mt": 109, "Ds": 110, "Rg": 111,
    "Cn": 112, "Nh": 113, "Fl": 114, "Mc": 115, "Lv": 116, "Ts": 117,
    "Og": 118,
}

# Patterns for nuclide strings found in NSR keywords
# e.g. "16O", "{+16}O", "$^{16}$O", "208Pb", etc.
NUCLIDE_PATTERNS = [
    # {+A}Sym  — common NSR LaTeX-like format
    re.compile(r"\{\+(\d+)\}([A-Z][a-z]?)"),
    # $^{A}$Sym
    re.compile(r"\$\^\{(\d+)\}\$([A-Z][a-z]?)"),
    # ^{A}Sym
    re.compile(r"\^\{(\d+)\}([A-Z][a-z]?)"),
    # Plain ASymbol, e.g. 16O, 208Pb  (mass number + element symbol)
    re.compile(r"\b(\d{1,3})([A-Z][a-z]?)\b"),
]

# Reaction patterns like (n,gamma), (p,p'), (d,3He), (alpha,n), etc.
REACTION_RE = re.compile(
    r"\("
    r"[A-Za-z0-9αγ',]+"  # incoming
    r","
    r"[A-Za-z0-9αγ'xnpdt ]+"  # outgoing
    r"\)"
)


def extract_nuclides(text: str) -> list[str]:
    """Return deduplicated list of nuclides like ['16O', '208Pb']."""
    found: set[str] = set()
    for pat in NUCLIDE_PATTERNS:
        for m in pat.finditer(text):
            mass, sym = m.group(1), m.group(2)
            if sym in ELEMENT_Z:
                found.add(f"{mass}{sym}")
    return sorted(found)


def extract_reactions(text: str) -> list[str]:
    """Return deduplicated list of reactions like ['(n,gamma)', '(p,p\\')']. """
    found: set[str] = set()
    for m in REACTION_RE.finditer(text):
        found.add(m.group(0))
    return sorted(found)


def nuclide_to_z(nuclide: str) -> Optional[int]:
    """Convert '16O' → 8."""
    m = re.match(r"(\d+)([A-Z][a-z]?)", nuclide)
    if m:
        return ELEMENT_Z.get(m.group(2))
    return None


BATCH_SIZE = 500


def main() -> None:
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Error: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(1)

    sb = create_client(url, key)

    # Fetch records in pages
    offset = 0
    total_updated = 0

    while True:
        resp = (
            sb.table("nsr")
            .select("id, keywords")
            .order("id")
            .range(offset, offset + BATCH_SIZE - 1)
            .execute()
        )

        rows = resp.data
        if not rows:
            break

        updates = []
        for row in rows:
            kw: str = row.get("keywords") or ""
            nuclides = extract_nuclides(kw)
            reactions = extract_reactions(kw)
            z_values = sorted({z for n in nuclides if (z := nuclide_to_z(n)) is not None})

            updates.append({
                "id": row["id"],
                "nuclides": nuclides or None,
                "reactions": reactions or None,
                "z_values": z_values or None,
            })

        # Batch upsert
        for u in updates:
            sb.table("nsr").update({
                "nuclides": u["nuclides"],
                "reactions": u["reactions"],
                "z_values": u["z_values"],
            }).eq("id", u["id"]).execute()

        total_updated += len(updates)
        print(f"  processed {total_updated} records ...", flush=True)
        offset += BATCH_SIZE

    print(f"Done. Updated {total_updated} records.")


if __name__ == "__main__":
    main()
