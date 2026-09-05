import { m } from "@rilldata/web-common/lib/i18n/gen/messages";

export interface DimensionFilterChipBodyProps {
  label: string;
  values: string[];
  matchedCount?: number;
  search?: string;
  loading?: boolean;
  show?: number;
  smallChip?: boolean;
  labelMaxWidth?: string;
  valueMaxWidth?: string;
}

/**
 * React translation of `DimensionFilterChipBody.svelte`. Renders the readonly body
 * of a dimension filter chip: either the matched search count (Contains mode), the
 * matched/selected list count (InList mode), or the truncated selected values.
 */
export default function DimensionFilterChipBody({
  label,
  values,
  matchedCount,
  search,
  loading = false,
  show = 1,
  smallChip = false,
  labelMaxWidth = "160px",
  valueMaxWidth = "320px",
}: DimensionFilterChipBodyProps) {
  const whatsLeft = values.length - show;

  return (
    <div className="flex gap-x-2 items-center truncate">
      <span
        className="font-bold truncate"
        style={{ maxWidth: smallChip ? "150px" : labelMaxWidth }}
      >
        {label}
      </span>

      {search !== undefined ? (
        <>
          <span>{m.dashboard_contains()}</span>
          {loading ? (
            <Spinner size="10px" />
          ) : (
            <span className="italic">
              {search} ({matchedCount})
            </span>
          )}
        </>
      ) : matchedCount !== undefined ? (
        <>
          <span>{m.dashboard_in_list()}</span>
          {loading ? (
            <Spinner size="10px" />
          ) : (
            <span className="italic">
              ({matchedCount} {m.dashboard_of()} {values.length})
            </span>
          )}
        </>
      ) : (
        <>
          {!smallChip &&
            values.slice(0, show).map((value) => (
              <span className="truncate" style={{ maxWidth: valueMaxWidth }} key={value}>
                {value}
              </span>
            ))}

          {smallChip ? (
            <span className="italic">
              {m.dashboard_selected({ count: values.length })}
            </span>
          ) : values.length > 1 ? (
            <span className="italic flex-none">
              {m.dashboard_others({ count: whatsLeft })}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Minimal React stand-in for the Svelte `Spinner` icon. */
function Spinner({ size = "1em" }: { size?: string }) {
  return (
    <svg
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className="animate-spin"
      style={{ transformOrigin: "center" }}
    >
      <circle cx="12" cy="12" r="11" opacity="0.25" />
      <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
    </svg>
  );
}
