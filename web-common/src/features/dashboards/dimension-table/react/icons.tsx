/**
 * React translations of the small Svelte icon components the dimension-table
 * views depend on (components/icons/*.svelte). The SVGs are transcribed
 * verbatim; only the Svelte prop syntax is translated to React props.
 */

export interface IconProps {
  size?: string;
  color?: string;
  className?: string;
}

/** components/icons/ArrowDown.svelte (a down/up sort arrow, `flip` rotates it). */
export function ArrowDown({
  size = "1em",
  color = "currentColor",
  className = "",
  flip = false,
}: IconProps & { flip?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={`${className} ${flip ? "rotate-180" : ""}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.3672 13.7775C18.8016 13.7775 19.0294 14.2935 18.7366 14.6145L12.3694 21.595C12.1711 21.8124 11.8289 21.8124 11.6306 21.595L5.26341 14.6145C4.97063 14.2935 5.19836 13.7775 5.63282 13.7775H10.4023L10.4023 2.5C10.4023 2.22386 10.6262 2 10.9023 2L13.4379 2C13.714 2 13.9379 2.22386 13.9379 2.5L13.9379 13.7775L18.3672 13.7775Z"
        fill={color}
      />
    </svg>
  );
}

/** components/icons/Check.svelte (included filter marker). */
export function Check({ size = "1em", color = "currentColor", className = "" }: IconProps) {
  return (
    <svg
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.8161 6.57646C19.0184 6.75315 19.0449 7.05808 18.8763 7.26707L10.0888 18.1532L5.35091 13.3443C5.15711 13.1476 5.15947 12.831 5.35618 12.6372L6.24661 11.7599C6.44332 11.5661 6.7599 11.5685 6.9537 11.7652L9.98966 14.8467L17.1579 5.82284C17.3354 5.59943 17.6635 5.56958 17.8784 5.75728L18.8161 6.57646Z"
        fill={color}
      />
    </svg>
  );
}

/** components/icons/CheckCircle.svelte (selected + compared marker). */
export function CheckCircle({ size = "1em", color = "currentColor", className = "" }: IconProps) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM10.4977 18.1532L18.5873 8.89285L16.8928 7.4126L10.3986 14.8467L7.01172 11.409L5.40894 12.9881L10.4977 18.1532Z"
        fill={color}
      />
    </svg>
  );
}

/** components/icons/Cancel.svelte (excluded filter marker). */
export function Cancel({ size = "1em", color = "currentColor", className = "" }: IconProps) {
  return (
    <svg
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.61339 5.90083C7.7354 5.77882 7.93322 5.77882 8.05523 5.90083L11.7791 9.62468C11.9011 9.74669 12.0989 9.74669 12.2209 9.62468L15.9448 5.90083C16.0668 5.77882 16.2646 5.77882 16.3866 5.90083L17.9085 7.42272C18.0305 7.54473 18.0305 7.74255 17.9085 7.86456L14.1846 11.5884C14.0626 11.7104 14.0626 11.9082 14.1846 12.0302L17.9085 15.7541C18.0305 15.8761 18.0305 16.0739 17.9085 16.1959L16.3866 17.7178C16.2646 17.8398 16.0668 17.8398 15.9448 17.7178L12.2209 13.994C12.0989 13.872 11.9011 13.872 11.7791 13.994L8.05523 17.7178C7.93322 17.8398 7.7354 17.8398 7.61339 17.7178L6.09151 16.1959C5.9695 16.0739 5.9695 15.8761 6.09151 15.7541L9.81536 12.0302C9.93737 11.9082 9.93737 11.7104 9.81536 11.5884L6.09151 7.86456C5.9695 7.74255 5.9695 7.54473 6.09151 7.42272L7.61339 5.90083Z"
        fill={color}
      />
    </svg>
  );
}

/** components/icons/Spacer.svelte (blank selection gutter slot). */
export function Spacer({ size = "1em", className = "" }: { size?: string; className?: string }) {
  return <div style={{ width: size, height: size }} className={className} />;
}

/** components/icons/ExternalLink.svelte (URI dimension link icon). */
export function ExternalLink({ size = "1em", className = "" }: IconProps) {
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

/** components/icons/Pin.svelte (pin-column action, only surfaced when !noPin). */
export function Pin({ size = "1em", color = "currentColor" }: IconProps) {
  return (
    <svg
      width={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17 14.5C17.5523 14.5 18.0127 14.0433 17.8543 13.5142C17.6072 12.6889 17.0527 11.9256 16.2426 11.318C15.1174 10.4741 13.5913 10 12 10C10.4087 10 8.88258 10.4741 7.75736 11.318C6.9473 11.9256 6.39279 12.6889 6.14572 13.5142C5.98732 14.0433 6.44772 14.5 7 14.5L12 14.5H17Z"
        fill={color}
      />
      <path
        d="M17 14.5C17.5523 14.5 18.0127 14.0433 17.8543 13.5142C17.6072 12.6889 17.0527 11.9256 16.2426 11.318C15.1174 10.4741 13.5913 10 12 10C10.4087 10 8.88258 10.4741 7.75736 11.318C6.9473 11.9256 6.39279 12.6889 6.14572 13.5142C5.98732 14.0433 6.44772 14.5 7 14.5L12 14.5H17Z"
        fill={color}
      />
      <path
        d="M7.5 2C7.22386 2 6.9961 2.22519 7.03888 2.498C7.17645 3.37525 7.67472 4.19663 8.46447 4.82843C9.40215 5.57857 10.6739 6 12 6C13.3261 6 14.5979 5.57857 15.5355 4.82843C16.3253 4.19663 16.8235 3.37525 16.9611 2.498C17.0039 2.22519 16.7761 2 16.5 2L12 2L7.5 2Z"
        fill={color}
      />
      <rect x="9" y="3" width="6" height="10" fill={color} />
      <path
        d="M11.5 10H12.5V20V20.5279C12.5 20.8384 12.4277 21.1446 12.2889 21.4223L12.1118 21.7764C12.0657 21.8685 11.9343 21.8685 11.8882 21.7764L11.7111 21.4223C11.5723 21.1446 11.5 20.8384 11.5 20.5279V20V10Z"
        fill={color}
      />
    </svg>
  );
}

/** components/icons/Compare.svelte (dimension compare toggle, colored when active). */
export function Compare({
  size = "1em",
  isColored = false,
}: IconProps & { isColored?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
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
