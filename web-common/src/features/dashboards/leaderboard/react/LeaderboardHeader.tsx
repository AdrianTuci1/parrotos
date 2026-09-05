/**
 * React translation of `features/dashboards/leaderboard/LeaderboardHeader.svelte`.
 *
 * Renders the leaderboard `<thead>`: the comparison gutter (spinner / compare
 * menu / spacer), the sticky dimension header (with tooltip + optional resize
 * handle), and one sortable header column per measure (value, percent-of-total,
 * delta absolute, delta percent). The Svelte `in:fly` entrance transitions are
 * dropped (the arrows render statically); the scoped `<style>` blocks are folded
 * into `className`.
 */
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { SortType } from "../../proto-state/derived-types";
import {
  DEFAULT_DIMENSION_COLUMN_WIDTH,
  MAX_DIMENSION_COLUMN_WIDTH,
  MIN_DIMENSION_COLUMN_WIDTH,
} from "../leaderboard-widths";
import {
  ArrowDownIcon,
  CompareIcon,
  DeltaChangeIcon,
  DeltaChangePercentageIcon,
  PercentOfTotalIcon,
  SpacerIcon,
} from "./icons";
import { DelayedSpinner, Resizer, Tooltip } from "./primitives";

export interface LeaderboardHeaderProps {
  dimensionName: string;
  isFetching: boolean;
  isValidPercentOfTotal: (measureName: string) => boolean;
  isTimeComparisonActive: boolean;
  isBeingCompared: boolean;
  sortedAscending: boolean;
  displayName: string;
  dimensionDescription: string;
  hovered: boolean;
  sortType: SortType;
  allowDimensionComparison: boolean;
  allowExpandTable: boolean;
  leaderboardMeasureNames: string[];
  leaderboardSortByMeasureName: string | null;
  // Measures that render context columns; see Leaderboard.tsx.
  measuresWithContext: Set<string>;
  toggleSort: (sortType: SortType, measureName?: string) => void;
  setPrimaryDimension: (dimensionName: string) => void;
  toggleComparisonDimension: (dimensionName: string | undefined) => void;
  measureLabel: (measureName: string) => string;
  dimensionColumnWidth: number;
  onDimensionColumnResize?: ((width: number) => void) | null;
  // Height of the whole leaderboard table, so the resize handle can span all
  // rows instead of just the header cell.
  tableHeight?: number;
}

export default function LeaderboardHeader({
  dimensionName,
  isFetching,
  isValidPercentOfTotal,
  isTimeComparisonActive,
  isBeingCompared,
  sortedAscending,
  displayName,
  dimensionDescription,
  hovered,
  sortType,
  allowDimensionComparison,
  allowExpandTable,
  leaderboardMeasureNames,
  leaderboardSortByMeasureName,
  measuresWithContext,
  toggleSort,
  setPrimaryDimension,
  toggleComparisonDimension,
  measureLabel,
  dimensionColumnWidth,
  onDimensionColumnResize = null,
  tableHeight = 0,
}: LeaderboardHeaderProps) {
  return (
    <thead>
      <tr>
        <th
          aria-label={m.dashboard_comparison_column_aria()}
          className="grid place-content-center"
        >
          {isFetching ? (
            <DelayedSpinner isLoading={isFetching} size="16px" />
          ) : allowDimensionComparison && (hovered || isBeingCompared) ? (
            <DimensionCompareMenu
              dimensionName={dimensionName}
              isBeingCompared={isBeingCompared}
              toggleComparisonDimension={toggleComparisonDimension}
            />
          ) : (
            <SpacerIcon size="14px" />
          )}
        </th>

        <th
          data-dimension-header
          className={`${onDimensionColumnResize ? "resizable" : ""}`}
        >
          <Tooltip
            location="top"
            content={
              <div style={{ maxWidth: "280px" }}>
                <div
                  className="pointer-events-none items-baseline"
                  aria-label="tooltip-name"
                >
                  {displayName}
                </div>
                {dimensionDescription ? (
                  <div
                    className="grid gap-x-2 pointer-events-none pt-1 pb-1 items-baseline"
                    style={{
                      gridTemplateColumns: "auto max-content",
                      minWidth: "200px",
                    }}
                  >
                    <div
                      className="text-fg-inverse/70 justify-self-start"
                      style={{ maxWidth: "280px" }}
                      aria-label="tooltip-name-description"
                    >
                      {dimensionDescription}
                    </div>
                  </div>
                ) : null}
              </div>
            }
          >
            <button
              disabled={!allowExpandTable}
              className={`text-fg-muted text-left ${allowExpandTable ? "hover:text-theme-700" : ""}`}
              aria-label={m.dashboard_open_dimension_details_aria()}
              onClick={() => setPrimaryDimension(dimensionName)}
            >
              <span className="line-clamp-2">{displayName}</span>
            </button>
          </Tooltip>

          {onDimensionColumnResize ? (
            <div className="resizer-container" style={{ height: `${tableHeight}px` }}>
              <Resizer
                side="right"
                direction="EW"
                min={MIN_DIMENSION_COLUMN_WIDTH}
                max={MAX_DIMENSION_COLUMN_WIDTH}
                basis={DEFAULT_DIMENSION_COLUMN_WIDTH}
                dimension={dimensionColumnWidth}
                onUpdate={onDimensionColumnResize}
              >
                <div className="resize-bar" />
              </Resizer>
            </div>
          ) : null}
        </th>

        {leaderboardMeasureNames.map((measureName) => (
          <HeaderCellGroup
            key={measureName}
            measureName={measureName}
            {...{
              isValidPercentOfTotal,
              isTimeComparisonActive,
              sortedAscending,
              sortType,
              leaderboardMeasureNames,
              leaderboardSortByMeasureName,
              measuresWithContext,
              toggleSort,
              measureLabel,
            }}
          />
        ))}
      </tr>
    </thead>
  );
}

/**
 * Renders the label cell + sort arrows for one measure, plus (when the measure
 * has context columns) the percent-of-total, delta-absolute and delta-percent
 * sort headers. This mirrors the `{#each leaderboardMeasureNames ...}` block in
 * the Svelte `<thead>`.
 */
function HeaderCellGroup({
  measureName,
  isValidPercentOfTotal,
  isTimeComparisonActive,
  sortedAscending,
  sortType,
  leaderboardMeasureNames,
  leaderboardSortByMeasureName,
  measuresWithContext,
  toggleSort,
  measureLabel,
}: {
  measureName: string;
  isValidPercentOfTotal: (measureName: string) => boolean;
  isTimeComparisonActive: boolean;
  sortedAscending: boolean;
  sortType: SortType;
  leaderboardMeasureNames: string[];
  leaderboardSortByMeasureName: string | null;
  measuresWithContext: Set<string>;
  toggleSort: (sortType: SortType, measureName?: string) => void;
  measureLabel: (measureName: string) => string;
}) {
  const showSortArrow =
    measureName === leaderboardSortByMeasureName && sortType === SortType.VALUE;

  const isSortingThis =
    measureName === leaderboardSortByMeasureName;

  return (
    <>
      <th data-measure-header key={`value-${measureName}`}>
        <button
          aria-label={m.dashboard_sort_by_value_aria()}
          onClick={() => {
            toggleSort(SortType.VALUE, measureName);
          }}
          className="font-normal text-right"
        >
          <span
            className="measure-label line-clamp-2 text-fg-muted"
            title={measureLabel(measureName)}
          >
            {leaderboardMeasureNames.length > 1
              ? measureLabel(measureName)
              : "#"}
          </span>
          {showSortArrow ? (
            <div className="text-fg-muted">
              {sortedAscending ? (
                <ArrowDownIcon flip />
              ) : (
                <ArrowDownIcon />
              )}
            </div>
          ) : null}
        </button>
      </th>

      {isValidPercentOfTotal(measureName) && measuresWithContext.has(measureName) ? (
        <th data-percent-of-total-header key={`pct-${measureName}`}>
          <button
            aria-label={m.dashboard_sort_by_percent_total_aria()}
            onClick={() => toggleSort(SortType.PERCENT, measureName)}
          >
            <PercentOfTotalIcon />
            {sortType === SortType.PERCENT && isSortingThis ? (
              <div className="text-fg-muted">
                {sortedAscending ? <ArrowDownIcon flip /> : <ArrowDownIcon />}
              </div>
            ) : null}
          </button>
        </th>
      ) : null}

      {isTimeComparisonActive && measuresWithContext.has(measureName) ? (
        <th data-absolute-change-header key={`deltaAbs-${measureName}`}>
          <button
            aria-label={m.dashboard_sort_by_absolute_change_aria()}
            onClick={() => toggleSort(SortType.DELTA_ABSOLUTE, measureName)}
          >
            <DeltaChangeIcon />
            {sortType === SortType.DELTA_ABSOLUTE &&
            isSortingThis ? (
              <div className="text-fg-muted">
                {sortedAscending ? (
                  <ArrowDownIcon flip />
                ) : (
                  <ArrowDownIcon />
                )}
              </div>
            ) : null}
          </button>
        </th>
      ) : null}

      {isTimeComparisonActive && measuresWithContext.has(measureName) ? (
        <th data-percent-change-header key={`deltaRel-${measureName}`}>
          <button
            aria-label={m.dashboard_sort_by_percent_change_aria()}
            onClick={() => toggleSort(SortType.DELTA_PERCENT, measureName)}
          >
            <DeltaChangePercentageIcon />
            {sortType === SortType.DELTA_PERCENT &&
            isSortingThis ? (
              <div className="text-fg-muted">
                {sortedAscending ? (
                  <ArrowDownIcon flip />
                ) : (
                  <ArrowDownIcon />
                )}
              </div>
            ) : null}
          </button>
        </th>
      ) : null}
    </>
  );
}

/**
 * React translation of
 * `features/dashboards/leaderboard/DimensionCompareMenu.svelte` — the
 * icon-button that toggles the comparison breakdown for the dimension.
 */
function DimensionCompareMenu({
  dimensionName,
  isBeingCompared,
  toggleComparisonDimension,
}: {
  dimensionName: string;
  isBeingCompared: boolean;
  toggleComparisonDimension: (dimensionName: string | undefined) => void;
}) {
  return (
    <button
      type="button"
      aria-label={m.leaderboard_toggle_breakdown({ name: dimensionName ?? "" })}
      onClick={(e) => {
        e.stopPropagation();
        if (dimensionName) toggleComparisonDimension(dimensionName);
      }}
      className="flex items-center"
    >
      <Tooltip
        location="left"
        distance={8}
        content={
          isBeingCompared
            ? m.leaderboard_remove_comparison()
            : m.leaderboard_compare()
        }
      >
        <CompareIcon isColored={isBeingCompared} />
      </Tooltip>
    </button>
  );
}
