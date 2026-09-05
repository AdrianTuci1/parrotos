/**
 * React translation of
 * `features/dashboards/leaderboard/LeaderboardItemFilterIcon.svelte`.
 *
 * Renders the selection-state glyph in the leaderboard's comparison gutter cell:
 * a colored check-circle when the value is selected & part of an active
 * comparison, a plain check when selected (include mode), a cancel when
 * selected-but-excluded (exclude mode), otherwise an empty spacer.
 */
import {
  COMPARISON_COLORS,
  SELECTED_NOT_COMPARED_COLOR,
} from "@rilldata/web-common/features/dashboards/config";
import {
  CancelIcon,
  CheckCircleIcon,
  CheckIcon,
  SpacerIcon,
} from "./icons";

export interface LeaderboardItemFilterIconProps {
  selectionIndex: number;
  excluded?: boolean;
  isBeingCompared?: boolean;
}

export default function LeaderboardItemFilterIcon({
  selectionIndex,
  excluded = false,
  isBeingCompared = false,
}: LeaderboardItemFilterIconProps) {
  const selected = selectionIndex >= 0;

  function getColor(i: number) {
    if (i >= 7) return SELECTED_NOT_COMPARED_COLOR;
    return COMPARISON_COLORS[i];
  }

  return (
    <div className="size-full flex items-center justify-center">
      {selected && !excluded && isBeingCompared ? (
        <CheckCircleIcon color={getColor(selectionIndex)} size="18px" />
      ) : selected && !excluded ? (
        <CheckIcon size="20px" />
      ) : selected && excluded ? (
        <CancelIcon size="20px" />
      ) : (
        <SpacerIcon />
      )}
    </div>
  );
}
