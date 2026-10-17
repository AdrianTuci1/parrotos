<script lang="ts">
  export let width = "27";
  export let height = "21";
  export let mode: "light" | "dark" | "adapt" = "adapt";

  // The supplied mark is near-black. Keep that in light mode and switch to a light
  // neutral in dark mode, where a black shape would disappear into the header.
  $: fillA =
    mode === "dark"
      ? "fill-neutral-100"
      : mode === "light"
        ? "fill-[#0E0E0E]"
        : "fill-[#0E0E0E] dark:fill-neutral-100";
  $: fillB =
    mode === "dark"
      ? "fill-neutral-100"
      : mode === "light"
        ? "fill-[#101010]"
        : "fill-[#101010] dark:fill-neutral-100";
  $: stroke =
    mode === "dark"
      ? "stroke-neutral-100"
      : mode === "light"
        ? "stroke-black"
        : "stroke-black dark:stroke-neutral-100";
</script>

<svg
  {width}
  {height}
  viewBox="0 0 504 385"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M196 126.484L503 0.483887C456.167 12.6506 359.2 37.9839 346 41.9839C238.8 -0.0161133 201.333 80.8172 196 126.484Z"
    class={`${fillA} ${stroke}`}
  />
  <path
    d="M327.5 107.484L138.5 384.984L152 233.984L0 195.984L327.5 107.484Z"
    class={fillB}
  />
</svg>
