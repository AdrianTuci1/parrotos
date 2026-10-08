<script lang="ts">
  export let width = "27";
  export let height = "18";
  export let mode: "light" | "dark" | "adapt" = "adapt";

  $: color =
    mode === "adapt"
      ? "fill-primary-700 dark:fill-neutral-900"
      : mode === "dark"
        ? "fill-neutral-900"
        : "fill-primary-700";
</script>

<svg
  {width}
  {height}
  viewBox="0 0 1176 804"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M224.625 434.468L669.732 36.9207L1175.96 39.1459L438.242 619.909L224.625 434.468Z"
    class={color}
  />
  <path
    d="M172.447 168.063L33.9461 171.095L170.772 32.7484L172.447 168.063Z"
    class={color}
  />
  <path
    d="M480.044 665.726L612.036 545.79L613.919 783.655L480.044 665.726Z"
    class={color}
  />
  <path
    d="M403.636 204.715L198.465 382.94L195.155 30.193L403.636 204.715Z"
    class={color}
  />
</svg>
