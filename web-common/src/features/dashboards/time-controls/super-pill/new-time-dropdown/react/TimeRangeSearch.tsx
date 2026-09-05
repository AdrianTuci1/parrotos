import { useMemo, useRef, useState, type FormEvent } from "react";
import { parseRillTime } from "@rilldata/web-common/features/dashboards/url-state/time-ranges/parser";
import { ALL_TIME_RANGE_ALIAS } from "@rilldata/web-common/features/dashboards/time-controls/new-time-controls";
import { localStorageStore } from "@rilldata/web-common/lib/store-utils";
import { useReadable } from "@rilldata/web-common/features/components/charts/react/useReadable";
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { ClockIcon } from "./icons";
import { SyntaxElement } from "./SyntaxElement";

/**
 * React translation of `super-pill/components/TimeRangeSearch.svelte`. Text input that
 * parses a Rill time string, remembers recent searches in `localStorage`, and renders
 * recent searches as syntax chips. Uses `useReadable()` to bridge the Svelte
 * `localStorageStore`.
 */
export interface TimeRangeSearchProps {
  context: string;
  width: number;
  inError: boolean;
  timeString?: string | undefined;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSelectRange: (range: string) => void;
}

export function TimeRangeSearch({
  context,
  width,
  inError,
  timeString,
  searchValue,
  onSearchValueChange,
  onSelectRange,
}: TimeRangeSearchProps) {
  const searchElement = useRef<HTMLInputElement>(null);
  const [unableToParse, setUnableToParse] = useState(false);

  const recentSearches = useMemo(
    () =>
      localStorageStore<string[]>(`${context}-recent-searches`, [
        "-7d/d to -3d/d",
        "-1d/d to -1d/d+6h",
        "D3 of M11",
      ]),
    [context],
  );
  const latestNSearches = useReadable(recentSearches) ?? [];

  const formError =
    (inError || unableToParse) && timeString !== ALL_TIME_RANGE_ALIAS;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (searchValue === ALL_TIME_RANGE_ALIAS) {
      onSelectRange(ALL_TIME_RANGE_ALIAS);
      onSearchValueChange("");
      setUnableToParse(false);
      return;
    }

    try {
      parseRillTime(searchValue);
      setUnableToParse(false);

      recentSearches.update((searches) => {
        return Array.from(new Set([searchValue, ...searches].slice(0, 15)));
      });

      onSelectRange(searchValue);
      onSearchValueChange("");
    } catch (e) {
      console.error(e);
      setUnableToParse(true);
    }
  }

  function updateSearch(value: string) {
    onSearchValueChange(value);
    searchElement.current?.focus();
  }

  return (
    <div
      className="border-b h-fit pt-2.5 py-0 flex p-3 gap-y-2 flex-col overflow-y-auto"
      style={{ width: `${width}px` }}
    >
      <form
        className={`overflow-hidden flex justify-center gap-x-1 items-center pl-2 pr-0.5 bg-input justify-center placeholder-fg-secondary text-fg-secondary border rounded-sm h-7 w-full truncate ${
          formError ? "border-red-500" : "focus-within:border-theme-500"
        }`}
        onSubmit={onSubmit}
      >
        <span
          className="mr-1 flex-none"
          role="presentation"
          onClick={() => searchElement.current?.focus()}
        >
          <ClockIcon size={15} />
        </span>
        <input
          placeholder={m.time_enter_time_range()}
          type="text"
          className="p-0 bg-transparent size-full outline-none border-0 cursor-text"
          value={searchValue}
          onChange={(e) => onSearchValueChange(e.target.value)}
          onKeyDown={() => {
            if (unableToParse) {
              setUnableToParse(false);
            }
          }}
          ref={searchElement}
        />
      </form>

      {unableToParse ? (
        <div className="text-red-500 text-xs">{m.time_unable_to_parse()}</div>
      ) : null}

      <div className="flex gap-x-2 size-full overflow-x-auto pb-2.5">
        {latestNSearches.map((search, i) => (
          <SyntaxElement key={i} range={search} onClick={updateSearch} />
        ))}
      </div>
    </div>
  );
}
