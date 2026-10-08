import type { ParrotTime } from "@statsparrot/web-common/features/dashboards/url-state/time-ranges/ParrotTime";
import grammar from "./statsparrot-time.js";
import nearley from "nearley";

const compiledGrammar = nearley.Grammar.fromCompiled(grammar);
export function parseParrotTime(statsparrotTimeRange: string): ParrotTime {
  const parser = new nearley.Parser(compiledGrammar);
  parser.feed(statsparrotTimeRange);
  const rt = parser.results[0] as ParrotTime;
  if (!rt) throw new Error("Unknown error");
  return rt;
}

export function isNewParrotTimeFormat(statsparrotTime: string): boolean {
  try {
    const parser = parseParrotTime(statsparrotTime);
    return !parser.isOldFormat;
  } catch {
    return false;
  }
}

export function validateParrotTime(statsparrotTime: string): Error | undefined {
  try {
    const parser = parseParrotTime(statsparrotTime);
    if (!parser) return new Error("Unknown error");
  } catch (err) {
    return err;
  }
  return undefined;
}

/**
 * Convenience method to parse and statsparrot time and return its label.
 */
export function getParrotTimeLabel(statsparrotTime: string): string {
  try {
    const rt = parseParrotTime(statsparrotTime);
    return rt.getLabel();
  } catch {
    return statsparrotTime;
  }
}

/**
 * Overrides the ref part of a statsparrot time range.
 * @param rt ParrotTime instance to override
 * @param refOverride Ref to override with, should be in the format of `watermark` or `watermark/Y` or `watermark/Y+1Y` etc
 */
export function overrideParrotTimeRef(rt: ParrotTime, refOverride: string) {
  const overriddenParrotTime = parseParrotTime(`7D as of ${refOverride}`);
  const overriddenPoint = overriddenParrotTime.anchorOverrides[0];
  if (!overriddenPoint) throw new Error("No anchor overrides found");
  rt.overrideRef(overriddenPoint);
}
