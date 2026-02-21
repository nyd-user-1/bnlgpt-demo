import { ExternalLink, Database, FlaskConical, FileCode, BookOpen } from "lucide-react";

interface Resource {
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  tag: string;
}

const resources: Resource[] = [
  {
    title: "X4Pro",
    description:
      "Universal, fully relational EXFOR database (professional edition). Includes SQL retrieval, Python demo programs, and tools to retrieve, plot, renormalize, and recalculate EXFOR data.",
    url: "https://www-nds.iaea.org/x4pro/",
    icon: <Database className="h-5 w-5" />,
    tag: "Database",
  },
  {
    title: "EXFOR-X5json",
    description:
      "Comprehensive full EXFOR library with supplementary data in X5-JSON format. Includes meta-data, dictionary-information, and data for renormalization by monitor cross sections and decay data.",
    url: "https://www-nds.iaea.org/cdroms/",
    icon: <FileCode className="h-5 w-5" />,
    tag: "Data Format",
  },
  {
    title: "EXFOR-C5",
    description:
      "Full EXFOR library translated to computational format C5, compatible with C4 format based on ENDF designation MF:MT. Extended by generalized systematic and statistical uncertainties.",
    url: "https://www-nds.iaea.org/cdroms/",
    icon: <FileCode className="h-5 w-5" />,
    tag: "Data Format",
  },
  {
    title: "ENDF Libraries",
    description:
      "35+ Evaluated Data Libraries including ENDF/B-VIII.1, JEFF-3.2, JENDL-4.0, CENDL-3.1, BROND-3.1, ROSFOND-2010, and IRDFF-v1.05.",
    url: "https://www-nds.iaea.org/cdroms/",
    icon: <BookOpen className="h-5 w-5" />,
    tag: "Evaluated Data",
  },
  {
    title: "EMPIRE",
    description:
      "Modular system of nuclear reaction codes for advanced modeling of nuclear reactions using various theoretical models. Available for Windows, Linux, and MacOS.",
    url: "https://www-nds.iaea.org/empire/",
    icon: <FlaskConical className="h-5 w-5" />,
    tag: "Reaction Code",
  },
  {
    title: "GRUCON",
    description:
      "ENDF Data Processing Code Package. Includes documentation, source, tests, and installers for Linux, Windows, and MacOS.",
    url: "https://www-nds.iaea.org/cdroms/",
    icon: <FlaskConical className="h-5 w-5" />,
    tag: "Processing",
  },
  {
    title: "X4Apps / X4Lite",
    description:
      "EXFOR-CINDA database (SQLite) with GUI (Java) retrieval system. Includes Endver/GUI package integrated with Prepro, EXFOR, ZVView. No installation required.",
    url: "https://www-nds.iaea.org/cdroms/",
    icon: <Database className="h-5 w-5" />,
    tag: "Database",
  },
  {
    title: "NSR Online (NNDC)",
    description:
      "The official Nuclear Science References database at Brookhaven National Laboratory. Search the full NSR bibliography of nuclear physics articles.",
    url: "https://www.nndc.bnl.gov/nsr/",
    icon: <BookOpen className="h-5 w-5" />,
    tag: "Bibliography",
  },
  {
    title: "EXFOR Online (IAEA)",
    description:
      "Search the EXFOR database of experimental nuclear reaction data directly through the IAEA Nuclear Data Services web interface.",
    url: "https://www-nds.iaea.org/exfor/",
    icon: <Database className="h-5 w-5" />,
    tag: "Database",
  },
];

export default function Resources() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Tools & Data</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Nuclear data packages, codes, and databases for research.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r) => (
          <a
            key={r.title}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-foreground">
                {r.icon}
                <span className="text-base font-bold">{r.title}</span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <span className="inline-block self-start rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground mb-3">
              {r.tag}
            </span>

            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
              {r.description}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
