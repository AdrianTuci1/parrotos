/**
 * Mock "Edit with AI" intent interpreter.
 *
 * Parrot's in-context card editing routes a natural-language prompt typed into the
 * card's inspector to the **developer agent**, which rewrites the card's YAML and the
 * file watcher reconciles it back onto the spec (see `chart-ai-agent.ts` /
 * `AIGenerateButton.svelte` in web-common). Without a live Parrot runtime + file system
 * this host maps a small set of English intents to card-field patches so the flow is
 * demonstrable end-to-end. Swap `applyMockAgentEdit` for a call to the runtime
 * developer agent when a runtime is present.
 */

const RENAME_RE =
  /(?:rename|title|call it)\s*(?:to|as|:)?\s*["“']?([^"”'\n]+)["”']?/;

export function applyMockAgentEdit(prompt, measure) {
  const p = (prompt || "").toLowerCase();
  const patch = {};
  const applied = [];

  // Chart type.
  if (/\bbar\b/.test(p)) {
    patch.mark = measure.mark === "bar" ? "area" : "bar";
    applied.push(`switched the chart to ${patch.mark === "bar" ? "bar" : "area"}`);
  } else if (/\bline\b/.test(p)) {
    patch.mark = measure.mark === "line" ? "area" : "line";
    applied.push(`switched the chart to ${patch.mark === "line" ? "line" : "area"}`);
  } else if (/\barea\b/.test(p)) {
    patch.mark = "area";
    applied.push("switched the chart to area");
  }

  // Sparkline / mini trend.
  if (/\bspark|mini|trend\b/.test(p)) {
    const off = /\b(without|remove|no|disable|turn off|hide)\b/.test(p);
    patch.sparkline = !off;
    applied.push(off ? "hid the sparkline" : "added a sparkline");
  }

  // Comparison (% change).
  if (/\bcompar|%\s*change|vs\b/.test(p) && !/\bwithout|remove|no\b/.test(p)) {
    patch.comparison = true;
    applied.push("enabled the comparison");
  } else if (/\bcompar|%\s*change|vs\b/.test(p)) {
    patch.comparison = false;
    applied.push("disabled the comparison");
  }

  // Format preset.
  if (/\bpercent\b/.test(p)) {
    patch.formatPreset = "percent";
    applied.push("set the format to percent");
  } else if (/\bcurrency|money|eur\b/.test(p)) {
    patch.formatPreset = "currency";
    applied.push("set the format to currency");
  } else if (/\bnumber\b/.test(p)) {
    patch.formatPreset = "number";
    applied.push("set the format to number");
  }

  // Visibility.
  if (/\bhidden?\b/.test(p) && !/no\s+hidden?\b/.test(p)) {
    patch.hide = true;
    applied.push("hid the card");
  } else if (/\b(unhide|show it|make visible|remove from hidden)\b/.test(p)) {
    patch.hide = false;
    applied.push("showed the card");
  }

  // Title / rename. Match against the original prompt so the casing is preserved.
  const rename = (prompt || "").match(RENAME_RE);
  if (rename && rename[1]) {
    patch.displayName = rename[1].trim();
    applied.push(`renamed it to “${rename[1].trim()}”`);
  }

  if (applied.length === 0) {
    patch.description =
      (measure.description || "") ||
      "Updated by the AI assistant from the card prompt.";
    applied.push(
      measure.description
        ? "updated the description"
        : "added a description",
    );
  }

  return { patch, message: `Done — I ${applied.join(" and ")}.` };
}

export default applyMockAgentEdit;
