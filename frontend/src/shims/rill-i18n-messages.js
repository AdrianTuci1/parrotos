/**
 * Stand-in for Rill's generated Paraglide message module
 * (`@rilldata/web-common/lib/i18n/gen/messages`). The React host does not run
 * the Paraglide codegen step, so we provide an `m` proxy that returns a readable
 * label for any message key. Labels only surface in time-range/time-grain pickers
 * and chart titles, so functional fidelity is preserved; exact copy is not.
 */
function humanize(key, args) {
  let label = String(key).replace(/^time_/, "").replace(/_/g, " ");
  label = label.replace(/\b\w/g, (c) => c.toUpperCase());
  label = label.replace(/\bN\b/g, String(args?.count ?? ""));
  label = label.replace(/\bLast \b/g, "Last ").replace(/\s+/g, " ").trim();
  return label;
}

export const m = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return (args) => humanize(prop, args);
    },
  },
);
