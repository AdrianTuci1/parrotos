<script lang="ts">
  import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
  import {
    getLocale,
    setLocale,
  } from "@statsparrot/web-common/lib/i18n/gen/runtime";
  import * as DropdownMenu from "@statsparrot/web-common/components/dropdown-menu";

  const LOCALES = [
    { code: "en", label: () => m.language_en() },
    { code: "es", label: () => m.language_es() },
  ] as const;

  const currentLocale = getLocale();
</script>

<DropdownMenu.Sub>
  <DropdownMenu.SubTrigger
    >{m.language_switcher_label()}</DropdownMenu.SubTrigger
  >
  <DropdownMenu.SubContent>
    {#each LOCALES as loc}
      <DropdownMenu.CheckboxItem
        checkRight
        checked={currentLocale === loc.code}
        onclick={() => setLocale(loc.code)}
      >
        {loc.label()}
      </DropdownMenu.CheckboxItem>
    {/each}
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>
