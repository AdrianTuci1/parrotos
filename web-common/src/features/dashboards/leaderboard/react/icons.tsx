/**
 * React stand-ins for the Svelte icon components used by the Leaderboard.
 *
 * Each is a verbatim translation of the matching `.svelte` icon (SVG paths copied
 * unchanged), following the same inline-stand-in convention used by the ported
 * `MeasureBigNumber.tsx` / `Chart.tsx`. Their scoped `<style>` blocks are folded
 * into `className` (e.g. `rotate-180` for `ArrowDown flip`).
 */

export function ArrowDownIcon({
  size = "1em",
  color = "currentColor",
  flip = false,
}: {
  size?: string;
  color?: string;
  flip?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={flip ? "rotate-180" : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.3672 13.7775C18.8016 13.7775 19.0294 14.2935 18.7366 14.6145L12.3694 21.595C12.1711 21.8124 11.8289 21.8124 11.6306 21.595L5.26341 14.6145C4.97063 14.2935 5.19836 13.7775 5.63282 13.7775H10.4023L10.4023 2.5C10.4023 2.22386 10.6262 2 10.9023 2L13.4379 2C13.714 2 13.9379 2.22386 13.9379 2.5L13.9379 13.7775L18.3672 13.7775Z"
        fill={color}
      />
    </svg>
  );
}

export function SpacerIcon({ size = "1em", className = "" }: { size?: string; className?: string }) {
  return <div style={{ width: size, height: size }} className={className} />;
}

export function ExternalLinkIcon({
  size = "1em",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6.91176 10.3636H10.3641V1.44108H1.44158V4.89342C1.44158 5.21559 1.18041 5.47676 0.858247 5.47676C0.536081 5.47676 0.274914 5.21559 0.274914 4.89342V1.14941C0.274914 0.666165 0.666665 0.274414 1.14991 0.274414H10.6558C11.139 0.274414 11.5308 0.666166 11.5308 1.14941V10.6553C11.5308 11.1385 11.139 11.5303 10.6558 11.5303H6.91176C6.58959 11.5303 6.32843 11.2691 6.32843 10.9469C6.32843 10.6248 6.58959 10.3636 6.91176 10.3636Z"
      />
      <path
        d="M6.91175 4.31009H3.88499C3.56283 4.31009 3.30166 4.57126 3.30166 4.89342C3.30166 5.21559 3.56283 5.47676 3.88499 5.47676H5.50346L0.445757 10.5345C0.217951 10.7623 0.217951 11.1316 0.445757 11.3594C0.673563 11.5872 1.04291 11.5872 1.27071 11.3594L6.32841 6.30172V7.92018C6.32841 8.24235 6.58958 8.50351 6.91175 8.50351C7.23391 8.50351 7.49508 8.24235 7.49508 7.92018V4.89383C7.49508 4.89332 7.49508 4.89241 7.49508 4.89191C7.49508 4.89036 7.49506 4.88859 7.49505 4.88704C7.49345 4.74043 7.43692 4.5943 7.32546 4.48218L7.32299 4.47971C7.26735 4.4244 7.20333 4.38261 7.13504 4.35435C7.06626 4.32583 6.99084 4.31009 6.91175 4.31009Z"
      />
    </svg>
  );
}

export function CheckIcon({
  size = "1em",
  color = "currentColor",
  className = "",
}: {
  size?: string;
  color?: string;
  className?: string;
}) {
  return (
    <svg height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.8161 6.57646C19.0184 6.75315 19.0449 7.05808 18.8763 7.26707L10.0888 18.1532L5.35091 13.3443C5.15711 13.1476 5.15947 12.831 5.35618 12.6372L6.24661 11.7599C6.44332 11.5661 6.7599 11.5685 6.9537 11.7652L9.98966 14.8467L17.1579 5.82284C17.3354 5.59943 17.6635 5.56958 17.8784 5.75728L18.8161 6.57646Z"
        fill={color}
      />
    </svg>
  );
}

export function CheckCircleIcon({
  size = "1em",
  color = "currentColor",
  className = "",
}: {
  size?: string;
  color?: string;
  className?: string;
}) {
  return (
    <svg height={size} width={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM10.4977 18.1532L18.5873 8.89285L16.8928 7.4126L10.3986 14.8467L7.01172 11.409L5.40894 12.9881L10.4977 18.1532Z"
        fill={color}
        className={className}
      />
    </svg>
  );
}

export function CancelIcon({
  size = "1em",
  color = "currentColor",
  className = "",
}: {
  size?: string;
  color?: string;
  className?: string;
}) {
  return (
    <svg height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.61339 5.90083C7.7354 5.77882 7.93322 5.77882 8.05523 5.90083L11.7791 9.62468C11.9011 9.74669 12.0989 9.74669 12.2209 9.62468L15.9448 5.90083C16.0668 5.77882 16.2646 5.77882 16.3866 5.90083L17.9085 7.42272C18.0305 7.54473 18.0305 7.74255 17.9085 7.86456L14.1846 11.5884C14.0626 11.7104 14.0626 11.9082 14.1846 12.0302L17.9085 15.7541C18.0305 15.8761 18.0305 16.0739 17.9085 16.1959L16.3866 17.7178C16.2646 17.8398 16.0668 17.8398 15.9448 17.7178L12.2209 13.994C12.0989 13.872 11.9011 13.872 11.7791 13.994L8.05523 17.7178C7.93322 17.8398 7.7354 17.8398 7.61339 17.7178L6.09151 16.1959C5.9695 16.0739 5.9695 15.8761 6.09151 15.7541L9.81536 12.0302C9.93737 11.9082 9.93737 11.7104 9.81536 11.5884L6.09151 7.86456C5.9695 7.74255 5.9695 7.54473 6.09151 7.42272L7.61339 5.90083Z"
        fill={color}
      />
    </svg>
  );
}

export function CompareIcon({
  size = "1em",
  isColored = false,
}: {
  size?: string;
  isColored?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.04359 4.14648L14.6922 11.2937C14.8803 11.4959 14.8688 11.8123 14.6666 12.0004C14.4644 12.1884 14.1481 12.177 13.96 11.9748L7.95634 5.5209L5.05894 7.9354L1.53282 6.01207C1.2904 5.87983 1.20107 5.57612 1.3333 5.33369C1.46553 5.09127 1.76925 5.00194 2.01167 5.13417L4.94099 6.73198L8.04359 4.14648Z"
        fill={isColored ? "var(--color-blue-600)" : "var(--color-gray-800)"}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.6666 3.66645C14.8427 3.87919 14.813 4.19437 14.6002 4.37043L5.05785 12.2676L1.53282 10.3448C1.2904 10.2126 1.20107 9.90887 1.3333 9.66645C1.46553 9.42402 1.76925 9.33469 2.01167 9.46693L4.94208 11.0653L13.9626 3.60003C14.1754 3.42397 14.4906 3.45371 14.6666 3.66645Z"
        fill={isColored ? "var(--color-red-600)" : "var(--color-gray-500)"}
      />
    </svg>
  );
}

export function DeltaIcon({ size = "1em", color = "currentColor" }: { size?: string; color?: string }) {
  return (
    <svg height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.49142 18H18.5087L12.0001 5.70587L5.49142 18ZM3.38863 18.766C3.21233 19.099 3.45373 19.5 3.83052 19.5H20.1696C20.5464 19.5 20.7878 19.099 20.6115 18.766L12.442 3.33466C12.2542 2.97992 11.746 2.97992 11.5582 3.33466L3.38863 18.766Z"
        fill={color}
      />
      <path
        d="M17.8569 19.2443L11.0933 7.16649C11.0332 7.05927 11.0148 6.93369 11.0414 6.81373L11.7055 3.82567C11.8063 3.37178 12.4179 3.28926 12.6354 3.70019L20.6115 18.7661C20.7878 19.0991 20.5464 19.5 20.1696 19.5H18.2931C18.1121 19.5 17.9453 19.4022 17.8569 19.2443Z"
        fill={color}
      />
    </svg>
  );
}

export function PieChartIcon({ size = "1em", color = "currentColor" }: { size?: string; color?: string }) {
  return (
    <svg height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14.7497 1.01468C14.4741 0.998446 14.25 1.22384 14.25 1.49998V9.49998L22.25 9.49998C22.5261 9.49998 22.7515 9.27593 22.7353 9.00027C22.6796 8.0549 22.4663 7.12426 22.103 6.24717C21.6758 5.21591 21.0497 4.27887 20.2604 3.48957C19.4711 2.70027 18.5341 2.07417 17.5028 1.647C16.6257 1.2837 15.6951 1.07035 14.7497 1.01468Z"
        fill={color}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.5 4.49998C12.5 3.82296 11.9419 3.22085 11.2035 3.26706C9.66504 3.36333 8.17579 3.86466 6.88876 4.72462C5.44983 5.68608 4.32832 7.05264 3.66606 8.6515C3.00379 10.2504 2.83051 12.0097 3.16813 13.707C3.50575 15.4044 4.33911 16.9635 5.56282 18.1872C6.78653 19.4109 8.34563 20.2442 10.043 20.5819C11.7403 20.9195 13.4996 20.7462 15.0985 20.0839C16.6973 19.4217 18.0639 18.3001 19.0254 16.8612C19.8853 15.5742 20.3867 14.0849 20.4829 12.5465C20.5291 11.8081 19.927 11.25 19.25 11.25H12.5V4.49998ZM7.72212 5.97182C8.64349 5.35618 9.68996 4.96237 10.7797 4.8152C10.8973 4.79932 11 4.89211 11 5.01075V12.75H18.7392C18.8579 12.75 18.9507 12.8527 18.9348 12.9703C18.7876 14.06 18.3938 15.1065 17.7782 16.0279C16.9815 17.2201 15.8492 18.1494 14.5245 18.6981C13.1997 19.2468 11.742 19.3904 10.3356 19.1107C8.92924 18.8309 7.63741 18.1404 6.62348 17.1265C5.60955 16.1126 4.91905 14.8207 4.63931 13.4144C4.35957 12.008 4.50314 10.5503 5.05188 9.22552C5.60061 7.90076 6.52986 6.76846 7.72212 5.97182Z"
        fill={color}
      />
    </svg>
  );
}

/** React stand-in for `dimension-table/DeltaChange.svelte` header icon. */
export function DeltaChangeIcon() {
  return (
    <div style={{ height: "16px" }} className="flex items-center">
      <DeltaIcon />
    </div>
  );
}

/** React stand-in for `dimension-table/DeltaChangePercentage.svelte` header icon. */
export function DeltaChangePercentageIcon() {
  return (
    <div style={{ height: "16px" }} className="flex items-center">
      <DeltaIcon /> %
    </div>
  );
}

/** React stand-in for `dimension-table/PercentOfTotal.svelte` header icon. */
export function PercentOfTotalIcon() {
  return (
    <div style={{ height: "16px" }} className="flex items-center">
      <PieChartIcon /> %
    </div>
  );
}
