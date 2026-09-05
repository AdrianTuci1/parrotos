// React translation of `layout/navigation/Footer.svelte`. The runtime-bound
// bindings are lifted out as props so the component is self-contained and
// unit-testable: `version`/`commitHash` come from the local-service metadata
// query in the Svelte original (`createLocalServiceGetMetadata`); `starButton`
// and `trafficLights` are the GitHub-star and RuntimeTrafficLights features.
import type { ReactNode } from "react";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import {
  Tooltip,
  Shortcut,
} from "@rilldata/web-common/features/dashboards/leaderboard/react/primitives";
import { GithubIcon, InfoCircleIcon } from "./icons";

export interface FooterProps {
  version?: string | null;
  commitHash?: string | null;
  starButton?: ReactNode;
  trafficLights?: ReactNode;
}

const lineItems = [
  {
    label: m.footer_report_issue(),
    href: "https://github.com/rilldata/rill/issues/new?assignees=&labels=bug&template=bug_report.md&title=",
  },
];

export default function Footer({
  version,
  commitHash,
  starButton,
  trafficLights,
}: FooterProps) {
  return (
    <div className="flex flex-col pt-3 pb-3 gap-y-1 bg-surface-subtle border-t sticky bottom-0">
      {lineItems.map((lineItem, i) => (
        <a
          key={i}
          href={lineItem.href}
          target="_blank"
          rel="noreferrer noopener"
        >
          <div className="flex flex-row items-center px-4 py-1 gap-x-2 text-fg-secondary font-normal hover:bg-popover-accent">
            <div className="grid place-content-center" style={{ width: "16px", height: "16px" }}>
              <GithubIcon size="14px" className="fill-fg-secondary" />
            </div>
            {lineItem.label}
          </div>
        </a>
      ))}
      {starButton}
      <div
        className="px-4 py-1 text-fg-secondary flex items-center flex-row w-full gap-x-2 truncate line-clamp-1"
        style={{ fontSize: "10px" }}
      >
        <span>
          <Tooltip
            alignment="start"
            distance={16}
            location="top"
            content={
              <div className="rounded p-2 bg-popover text-popover-foreground shadow-lg">
                <div className="font-medium">{m.footer_rill_developer()}</div>
                <div className="flex flex-row items-center gap-x-2">
                  <span>{m.footer_view_documentation()}</span>
                  <Shortcut>{m.footer_shortcut_click()}</Shortcut>
                </div>
              </div>
            }
          >
            <a
              href="https://docs.rilldata.com"
              target="_blank"
              rel="noreferrer noopener"
              className="text-fg-secondary"
            >
              <InfoCircleIcon size="16px" />
            </a>
          </Tooltip>
        </span>

        <span className="truncate">
          {m.footer_version()} {version ?? m.footer_unknown_version()}
          {commitHash ? ` – ${commitHash}` : ""}
        </span>
        {trafficLights}
      </div>
    </div>
  );
}
