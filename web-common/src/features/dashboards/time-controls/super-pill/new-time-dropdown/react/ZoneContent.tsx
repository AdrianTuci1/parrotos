import { useMemo, useState } from "react";
import {
  allTimeZones,
  formatIANAs,
  getLocalIANA,
} from "@rilldata/web-common/lib/time/timezone";
import type { DateTime } from "luxon";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { CheckIcon } from "./icons";
import { ZoneDisplay } from "./ZoneDisplay";

type ZoneMap = Map<
  string,
  { iana: string; offset: string; abbreviation: string }
>;

function filterTimeZones(zones: ZoneMap, searchValue: string): ZoneMap {
  return new Map(
    Array.from(zones).filter(
      ([iana, { abbreviation }]) =>
        iana.toLowerCase().includes(searchValue.toLowerCase()) ||
        abbreviation?.toLowerCase().includes(searchValue.toLowerCase()),
    ),
  );
}

const ITEM_CLASS =
  "w-full relative text-fg-primary justify-between flex cursor-pointer select-none items-start rounded-sm py-1.5 px-2 gap-x-2 text-xs outline-none hover:bg-popover-accent hover:text-fg-accent";
const SEPARATOR_CLASS = "h-px w-full bg-gray-200 my-1";
const HEADING_CLASS = "px-2 py-1.5 text-xs text-fg-secondary font-semibold";

/**
 * React translation of `super-pill/components/ZoneContent.svelte`. Searchable list of
 * available time zones with pinned, recent, and search-result sections. The recent-zones
 * persistence is kept in `localStorage` directly (no Svelte store/context in React).
 */
export interface ZoneContentProps {
  referencePoint: DateTime;
  availableTimeZones: string[];
  activeTimeZone: string;
  context: string;
  onSelectTimeZone: (timeZone: string) => void;
}

const MAX_RECENT = 5;

export function ZoneContent({
  referencePoint,
  availableTimeZones,
  activeTimeZone,
  context,
  onSelectTimeZone,
}: ZoneContentProps) {
  const browserIANA = getLocalIANA();
  const recentsKey = `${context}-recent-zones`;

  const [searchValue, setSearchValue] = useState("");
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(recentsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const ianaMap = useMemo(
    () => formatIANAs(allTimeZones, referencePoint),
    [referencePoint],
  );
  const pinnedTimeZones = useMemo(
    () => formatIANAs([...availableTimeZones, "UTC"], referencePoint),
    [availableTimeZones, referencePoint],
  );

  const filteredPinnedTimeZones = useMemo(
    () => filterTimeZones(pinnedTimeZones, searchValue),
    [pinnedTimeZones, searchValue],
  );
  const filteredTimeZones = useMemo(
    () => filterTimeZones(ianaMap, searchValue),
    [ianaMap, searchValue],
  );

  const formatted = ianaMap.get(activeTimeZone);

  function saveRecents(value: string[]) {
    setRecents(value);
    try {
      localStorage.setItem(recentsKey, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  function selectZone(iana: string) {
    onSelectTimeZone(iana);
    if (searchValue) {
      saveRecents(Array.from(new Set([iana, ...recents])).slice(0, MAX_RECENT));
    }
  }

  const showActiveNotPinned =
    !pinnedTimeZones.has(activeTimeZone) && !recents.includes(activeTimeZone);

  return (
    <div>
      <div className="p-1.5 pb-1 flex items-center gap-x-2">
        <input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          autoFocus={false}
          type="text"
          className="h-7 w-full border rounded-sm bg-input text-fg-secondary"
          placeholder={m.common_search()}
        />
      </div>

      {showActiveNotPinned && formatted ? (
        <div className="group">
          <button className={ITEM_CLASS} onClick={() => selectZone(activeTimeZone)}>
            <ZoneDisplay
              abbreviation={formatted.abbreviation}
              offset={formatted.offset}
              iana={activeTimeZone}
            />
            <CheckIcon size={16} className="size-4 text-fg-primary" />
          </button>
          <div className={SEPARATOR_CLASS}></div>
        </div>
      ) : null}

      <div className="group max-h-72 overflow-y-auto">
        {Array.from(filteredPinnedTimeZones).map(([iana, { offset, abbreviation }]) => (
          <button key={iana} className={ITEM_CLASS} onClick={() => selectZone(iana)}>
            <ZoneDisplay
              abbreviation={abbreviation}
              offset={offset}
              isBrowserTime={iana === browserIANA}
              iana={iana}
            />
            <span className="flex flex-none h-3.5 w-3.5 items-center justify-center">
              {activeTimeZone === iana ? (
                <CheckIcon size={16} className="size-4 text-fg-primary" />
              ) : null}
            </span>
          </button>
        ))}
      </div>

      {!searchValue && recents.length ? (
        <>
          <div className={SEPARATOR_CLASS}></div>
          <div className="group">
            <div className="flex justify-between pr-2 items-center">
              <h3 className={HEADING_CLASS}>{m.dashboard_recent()}</h3>
              {recents.length ? (
                <button
                  className="text-[11px] text-fg-secondary hover:bg-surface-hover p-1 rounded-sm h-fit"
                  onClick={() => saveRecents([])}
                >
                  {m.dashboard_clear_recents()}
                </button>
              ) : null}
            </div>

            {recents.map((iana, i) => {
              const formatted = ianaMap.get(iana);
              if (!formatted || availableTimeZones.includes(iana)) return null;
              return (
                <button key={i} className={ITEM_CLASS} onClick={() => selectZone(iana)}>
                  <ZoneDisplay
                    abbreviation={formatted.abbreviation}
                    offset={formatted.offset}
                    iana={iana}
                  />
                  <span className="flex flex-none h-3.5 w-3.5 items-center justify-center">
                    {activeTimeZone === iana ? (
                      <CheckIcon size={16} className="size-4 text-fg-primary" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {searchValue ? (
        <>
          <div className={SEPARATOR_CLASS}></div>
          <div className="group max-h-72 overflow-y-auto">
            <h3 className="sticky top-0 bg-gradient-to-b z-10 from-surface from-75% to-transparent">
              {m.dashboard_search_results()}
            </h3>

            {Array.from(filteredTimeZones).map(([iana, { abbreviation, offset }], i) => (
              <button key={iana} className={ITEM_CLASS} onClick={() => selectZone(iana)}>
                <ZoneDisplay iana={iana} offset={offset} abbreviation={abbreviation} />
                <span className="flex flex-none h-3.5 w-3.5 items-center justify-center">
                  {activeTimeZone === iana ? (
                    <CheckIcon size={16} className="size-4 text-fg-primary" />
                  ) : null}
                </span>
              </button>
            ))}
            {filteredTimeZones.size === 0 ? (
              <div>
                <p className="pt-0 pb-2 text-fg-secondary text-center">
                  {m.dashboard_no_options_found()}
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
