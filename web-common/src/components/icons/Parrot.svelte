<script lang="ts">
  export let width = "28";
  export let height = "28";
  // The badge carries its own blue surface in every theme, so `mode` stays in
  // the signature for callers that render the mark in both theme previews.
  export let mode: "light" | "dark" | "adapt" = "adapt";
</script>

<svg
  {width}
  {height}
  viewBox="0 0 550 550"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect width="550" height="550" rx="82" fill="var(--accent-primary, #0079c2)" />
  <path
    d="M217 226L524 100C477.167 112.167 380.2 137.5 367 141.5C259.8 99.5 222.333 180.333 217 226Z"
    fill="#EFEFEF"
  />
  <path
    d="M348.5 207L159.5 484.5L173 333.5L21 295.5L348.5 207Z"
    fill="#F0ECEC"
  />
</svg>
