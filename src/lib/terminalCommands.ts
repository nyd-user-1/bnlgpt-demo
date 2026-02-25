export type TerminalCommand =
  | { kind: "isotope"; nuclide: string }
  | { kind: "trend"; nuclide: string; window: string }
  | { kind: "author"; author: string }
  | { kind: "compare"; left: string; right: string }
  | { kind: "heatmap"; startYear: number; endYear: number }
  | { kind: "search"; query: string };

function normalizeNuclide(raw: string): string {
  const token = raw.trim();
  const dashMatch = token.match(/^([A-Za-z]{1,3})-(\d{1,3})$/);
  if (dashMatch) {
    const symbol = dashMatch[1][0].toUpperCase() + dashMatch[1].slice(1).toLowerCase();
    return `${dashMatch[2]}${symbol}`;
  }

  const suffixMatch = token.match(/^(\d{1,3})([A-Za-z]{1,3})$/);
  if (suffixMatch) {
    const symbol = suffixMatch[2][0].toUpperCase() + suffixMatch[2].slice(1).toLowerCase();
    return `${suffixMatch[1]}${symbol}`;
  }

  return token;
}

export function parseTerminalCommand(input: string): TerminalCommand {
  const value = input.trim();
  if (!value.startsWith("/")) return { kind: "search", query: value };

  const [cmd, ...rest] = value.slice(1).split(/\s+/);
  const payload = rest.join(" ").trim();

  switch (cmd.toLowerCase()) {
    case "isotope":
      return { kind: "isotope", nuclide: normalizeNuclide(payload) };
    case "trend": {
      const [nuclideToken, window = "10y"] = payload.split(/\s+/);
      return { kind: "trend", nuclide: normalizeNuclide(nuclideToken ?? ""), window };
    }
    case "author":
      return { kind: "author", author: payload };
    case "compare": {
      const parts = payload.split(/\s+vs\s+/i);
      if (parts.length !== 2) return { kind: "search", query: payload };
      return {
        kind: "compare",
        left: normalizeNuclide(parts[0]),
        right: normalizeNuclide(parts[1]),
      };
    }
    case "heatmap": {
      const [startRaw, endRaw] = payload.split("-");
      const startYear = Number(startRaw);
      const endYear = Number(endRaw);
      return {
        kind: "heatmap",
        startYear: Number.isFinite(startYear) ? startYear : 2000,
        endYear: Number.isFinite(endYear) ? endYear : new Date().getFullYear(),
      };
    }
    default:
      return { kind: "search", query: payload || value };
  }
}

export function commandToReferencesQuery(command: TerminalCommand): URLSearchParams {
  const params = new URLSearchParams();
  params.set("terminal", "1");

  switch (command.kind) {
    case "isotope":
      params.set("nuclide", command.nuclide);
      break;
    case "trend":
      params.set("nuclide", command.nuclide);
      params.set("trend", command.window);
      break;
    case "author":
      params.set("q", command.author);
      params.set("mode", "keyword");
      break;
    case "compare":
      params.set("compare", `${command.left},${command.right}`);
      break;
    case "heatmap":
      params.set("heatmap", `${command.startYear}-${command.endYear}`);
      break;
    case "search":
      params.set("q", command.query);
      params.set("mode", "semantic");
      break;
  }

  return params;
}
