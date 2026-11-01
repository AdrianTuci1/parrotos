import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  ChatPanel,
  FaqPanel,
  FilesPanel,
  GovernancePanel,
  LicensePanel,
  MovedPanel,
  SourcesPanel,
} from "./GuideVisuals";

type GuideEntry = {
  id: string;
  label: string;
  paragraphs: string[];
  visual: ReactNode;
};

const SECTIONS: GuideEntry[] = [
  {
    id: "guide-01",
    label: "See what moved",
    paragraphs: [
      "Open the app and the first question is already answered: what changed. Each tile carries its value and the delta against the previous period, with the trend that produced it underneath.",
      "The agent's first brief is a short written summary of the same data — the movement, the segment behind it, and what it means for the next release.",
    ],
    visual: <MovedPanel />,
  },
  {
    id: "guide-02",
    label: "Ask in plain English",
    paragraphs: [
      "Type a question the way you would ask a teammate. The agent reads your metrics layer, writes the query, runs it against your warehouse, and answers with the number, the chart and the reason it moved.",
      "Follow up in the same thread and it keeps the filters and the time range you already have in view.",
    ],
    visual: <ChatPanel />,
  },
  {
    id: "guide-03",
    label: "Model as files",
    paragraphs: [
      "Models, metrics and dashboards are files in a folder you own. Review them in a pull request, roll them back with git, and deploy them like the rest of your code.",
      "A metric is a YAML block: an expression over a model, a time column, and the dimensions you can slice by.",
    ],
    visual: <FilesPanel />,
  },
  {
    id: "guide-04",
    label: "Every source",
    paragraphs: [
      "Point Statsparrot at a warehouse, an object store or a directory of Parquet files. The same metric definition runs against every source, so a number means the same thing wherever it appears.",
      "Add a source, keep the models, and move a dashboard over when the data moves.",
    ],
    visual: <SourcesPanel />,
  },
  {
    id: "guide-05",
    label: "Govern access",
    paragraphs: [
      "Roles decide who can view a dashboard, explore the underlying data, change a metric definition, or manage the project. The rules are enforced by the runtime, so they hold for the app, the API and the CLI alike.",
    ],
    visual: <GovernancePanel />,
  },
  {
    id: "guide-06",
    label: "Open source",
    paragraphs: [
      "Statsparrot is open source under Apache-2.0: read the code that produces your numbers, run the runtime yourself, and keep whatever changes you make.",
      "Self-hosting is a container and a config file, and the image runs anywhere Docker runs.",
    ],
    visual: <LicensePanel />,
  },
  {
    id: "guide-07",
    label: "Questions",
    paragraphs: [
      "Two things people ask before installing. Everything else is in the docs.",
    ],
    visual: <FaqPanel />,
  },
];

// Sections highlight once their heading is a little below the sticky top bar.
const SPY_OFFSET = 160;

export function GuideSection() {
  const [active, setActive] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

      let current = 0;
      sectionRefs.current.forEach((element, index) => {
        if (element && element.getBoundingClientRect().top - SPY_OFFSET <= 0) {
          current = index;
        }
      });

      setActive(atBottom ? SECTIONS.length - 1 : current);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, index: number) {
    const target = sectionRefs.current[index];
    if (!target) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${SECTIONS[index].id}`);
  }

  return (
    <section className="guide" id="guide">
      <div className="container guide-layout">
        <aside className="guide-aside">
          <div className="guide-aside-inner">
            <p className="guide-aside-label">README.md</p>
            <div className="guide-aside-divider" />
            <nav aria-label="Guide">
              <ol className="guide-nav">
                {SECTIONS.map((section, index) => {
                  const isActive = index === active;
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className={`guide-nav-link${isActive ? " is-active" : ""}`}
                        aria-current={isActive ? "true" : undefined}
                        onClick={(event) => handleNavClick(event, index)}
                      >
                        <span className="guide-nav-num">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="guide-nav-label">{section.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </aside>

        <div className="guide-content">
          {SECTIONS.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="guide-block"
              ref={(element) => {
                sectionRefs.current[index] = element;
              }}
            >
              <h2>{section.label}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.visual}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
