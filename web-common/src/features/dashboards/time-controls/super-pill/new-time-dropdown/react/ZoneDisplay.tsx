import {
  formatIANA,
} from "@rilldata/web-common/lib/time/timezone";
import { DateTime } from "luxon";

/**
 * React translation of `super-pill/components/ZoneDisplay.svelte`. A single time-zone row
 * showing the abbreviation, IANA name (or "Browser Time"), and the offset.
 */
export interface ZoneDisplayProps {
  iana: string;
  isBrowserTime?: boolean;
  abbreviation?: string | undefined;
  offset?: string;
}

export function ZoneDisplay({
  iana,
  isBrowserTime = false,
  abbreviation,
  offset = formatIANA(iana, DateTime.now()).offset,
}: ZoneDisplayProps) {
  return (
    <div className="flex items-baseline text-xs w-full cursor-pointer justify-between overflow-hidden">
      <div className="flex gap-x-1 w-full overflow-hidden items-baseline">
        {abbreviation ? (
          <p className="w-12 truncate overflow-hidden text-left">{abbreviation}</p>
        ) : null}

        <p className="truncate font-normal text-left size-full">
          {isBrowserTime ? "Browser Time" : iana}
        </p>
      </div>

      <span className="self-end text-fg-secondary rounded-sm line-clamp-1 w-fit flex-none text-[11px]">
        {offset}
      </span>
    </div>
  );
}
