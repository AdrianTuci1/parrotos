import type { MeasureFilterEntry } from "@rilldata/web-common/features/dashboards/filters/measure-filters/measure-filter-entry";
import MeasureFilterBody from "./MeasureFilterBody";
import MeasureChip from "./Chip";

export interface MeasureFilterReadOnlyChipProps {
  dimensionName: string;
  label?: string;
  filter?: MeasureFilterEntry;
  pinned?: boolean;
  missingRequired?: boolean;
}

/**
 * React translation of `MeasureFilterReadOnlyChip.svelte`. Renders the static
 * (non-interactive) measure filter chip used in the read-only chip strips
 * (`FilterChipsReadOnly` / `CanvasFilterChipsReadOnly`).
 */
export default function MeasureFilterReadOnlyChip({
  dimensionName,
  label,
  filter,
  pinned,
  missingRequired = false,
}: MeasureFilterReadOnlyChipProps) {
  return (
    <MeasureChip
      theme
      readOnly
      showPinnedIcon={pinned}
      error={missingRequired}
      label={label}
    >
      <MeasureFilterBody dimensionName={dimensionName} filter={filter} label={label} />
    </MeasureChip>
  );
}
