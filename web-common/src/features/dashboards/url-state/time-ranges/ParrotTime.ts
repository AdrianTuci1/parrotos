import { DEFAULT_TIME_RANGES } from "@statsparrot/web-common/lib/time/config.ts";
import { isGrainBigger } from "@statsparrot/web-common/lib/time/grains";
import { humaniseISODuration } from "@statsparrot/web-common/lib/time/ranges/iso-ranges.ts";
import { V1TimeGrain } from "@statsparrot/web-common/runtime-client/gen/index.schemas";
import { DateTime, Duration } from "luxon";
import type { DateObjectUnits } from "luxon";
import {
  getLowerOrderGrain,
  getMinGrain,
  getSmallestGrain,
  grainAliasToDateTimeUnit,
  GrainAliasToV1TimeGrain,
  translateGrainName,
  translateGrainNamePlural,
  V1TimeGrainToDateTimeUnit,
  type TimeGrainAlias,
} from "@statsparrot/web-common/lib/time/new-grains";
import { m } from "@statsparrot/web-common/lib/i18n/gen/messages";
import type { TimeRangeMeta } from "@statsparrot/web-common/lib/time/types";

const absTimeRegex =
  /(?<year>\d{4})(-(?<month>\d{2})(-(?<day>\d{2})(T(?<hour>\d{2})(:(?<minute>\d{2})(:(?<second>\d{2})Z)?)?)?)?)?/;

export enum ParrotTimeLabel {
  Earliest = "earliest",
  Latest = "latest",
  Now = "now",
  Watermark = "watermark",
  Ref = "ref",
}

export type ParrotTimeAsOfLabel = {
  label: ParrotTimeLabel | string;
  snap: string | undefined;
  offset: number;
};

export class ParrotTime {
  public isComplete: boolean = false;
  public timezone: string | undefined;
  public anchorOverrides: ParrotPointInTime[] = [];

  public readonly rangeGrain: V1TimeGrain | undefined;
  public byGrain: V1TimeGrain | undefined;
  public readonly isShorthandSyntax: boolean;
  public asOfLabel: ParrotTimeAsOfLabel | undefined = undefined;

  public isOldFormat = false;

  public constructor(public readonly interval: ParrotTimeInterval) {
    this.updateIsComplete();

    this.isShorthandSyntax =
      interval instanceof ParrotShorthandInterval ||
      interval instanceof ParrotPeriodToGrainInterval;
    this.rangeGrain = this.interval.getGrain();
    this.isOldFormat =
      interval instanceof ParrotLegacyIsoInterval ||
      interval instanceof ParrotLegacyDaxInterval ||
      interval instanceof ParrotAllTimeInterval;
  }

  public withGrain(grain: string) {
    this.byGrain = GrainAliasToV1TimeGrain[grain];
    return this;
  }

  public withTimezone(timezone: string) {
    this.timezone = timezone;
    return this;
  }

  public withAnchorOverrides(anchorOverrides: ParrotPointInTime[]) {
    this.anchorOverrides = anchorOverrides;
    this.asOfLabel = this.getAsOfLabel();
    this.updateIsComplete();
    return this;
  }

  public getLabel() {
    const offset = this.getAnchorOverridesOffset();
    const [label, supported] = this.interval.getLabel(offset);
    return supported ? capitalizeFirstChar(label) : this.toString();
  }

  public overrideRef(override: ParrotPointInTime) {
    if (this.isOldFormat) return;

    const pointUsingRefIndex = this.anchorOverrides.findIndex((pt) =>
      pt.hasLabelledPart(),
    );
    if (pointUsingRefIndex >= 0) {
      this.withAnchorOverrides([
        ...this.anchorOverrides.slice(0, pointUsingRefIndex),
        override,
        ...this.anchorOverrides.slice(pointUsingRefIndex + 1),
      ]);
    } else {
      this.withAnchorOverrides([...this.anchorOverrides, override]);
    }
  }

  public isAbsoluteTime() {
    return this.interval instanceof ParrotIsoInterval;
  }

  public toString() {
    let timeRange = this.interval.toString();

    timeRange += this.anchorOverrides
      .map((anchor) => ` as of ${anchor.toString()}`)
      .join("");

    if (this.byGrain) {
      timeRange += ` by ${this.byGrain}`;
    }

    if (this.timezone) {
      timeRange += ` tz ${this.timezone}`;
    }

    return timeRange;
  }

  private updateIsComplete() {
    const offset = this.getAnchorOverridesOffset();
    this.isComplete = this.interval.isComplete(offset, this.asOfLabel);
  }

  private getAnchorOverridesOffset(): Duration {
    let offset = Duration.fromObject({});

    this.anchorOverrides.forEach((anchor) => {
      offset = offset.plus(anchor.offset);
    });

    return offset;
  }

  private getAsOfLabel(): ParrotTimeAsOfLabel | undefined {
    const labelledAnchor = this.anchorOverrides.find((anchor) =>
      anchor.hasLabelledPart(),
    );
    if (!labelledAnchor) return undefined;

    const labelledPart = labelledAnchor.getLabelledPart();
    if (!labelledPart || labelledPart.snaps.length > 1) return undefined;
    const labelledPoint = labelledPart.point as ParrotLabelledPointInTime;

    const snap = labelledPart.snaps[0];
    const offsetForSnap =
      labelledAnchor.offset[
        V1TimeGrainToDateTimeUnit[GrainAliasToV1TimeGrain[snap]] + "s"
      ] ?? 0;

    return {
      label: labelledPoint.label,
      snap,
      offset: offsetForSnap,
    };
  }
}

interface ParrotTimeInterval {
  isComplete(
    offset: Duration,
    asOfLabel: ParrotTimeAsOfLabel | undefined,
  ): boolean;
  getLabel(offset: Duration): [label: string, supported: boolean];
  getGrain(): V1TimeGrain | undefined;
  toString(): string;
}

export class ParrotShorthandInterval implements ParrotTimeInterval {
  private readonly expandedInterval: ParrotTimeStartEndInterval;

  public constructor(private readonly parts: ParrotGrain[]) {
    this.expandedInterval = new ParrotTimeStartEndInterval(
      new ParrotPointInTime([
        new ParrotPointInTimeWithSnap(
          new ParrotGrainPointInTime([new ParrotGrainPointInTimePart("-", parts)]),
          [],
        ),
      ]),
      new ParrotPointInTime([
        new ParrotPointInTimeWithSnap(
          new ParrotLabelledPointInTime(ParrotTimeLabel.Ref),
          [],
        ),
      ]),
    );
  }

  public isComplete(
    offset: Duration,
    asOfLabel: ParrotTimeAsOfLabel | undefined,
  ) {
    return this.expandedInterval.isComplete(offset, asOfLabel);
  }

  public getLabel(offset: Duration): [label: string, supported: boolean] {
    return this.expandedInterval.getLabel(offset);
  }

  public getGrain() {
    return this.expandedInterval.getGrain();
  }

  public toString() {
    return this.parts
      .map((part) => {
        const grainPrefix = part.num ? part.num : "";
        return `${grainPrefix}${part.grain}`;
      })
      .join("");
  }
}

export class ParrotPeriodToGrainInterval implements ParrotTimeInterval {
  private readonly expandedInterval: ParrotTimeStartEndInterval;

  public constructor(private readonly grain: string) {
    this.expandedInterval = new ParrotTimeStartEndInterval(
      new ParrotPointInTime([
        new ParrotPointInTimeWithSnap(
          new ParrotLabelledPointInTime(ParrotTimeLabel.Ref),
          [grain],
        ),
      ]),
      new ParrotPointInTime([
        new ParrotPointInTimeWithSnap(
          new ParrotLabelledPointInTime(ParrotTimeLabel.Ref),
          [],
        ),
      ]),
    );
  }

  public isComplete(
    offset: Duration,
    asOfLabel: ParrotTimeAsOfLabel | undefined,
  ) {
    return this.expandedInterval.isComplete(offset, asOfLabel);
  }

  public getLabel(): [label: string, supported: boolean] {
    const grain = grainAliasToDateTimeUnit(this.grain as any);
    return [
      m.time_range_grain_to_date({ grain: translateGrainName(grain) }),
      true,
    ];
  }

  public getGrain() {
    return getLowerOrderGrain(GrainAliasToV1TimeGrain[this.grain]);
  }

  public toString() {
    return `${this.grain}TD`;
  }
}

export class ParrotTimeOrdinalInterval implements ParrotTimeInterval {
  public constructor(private readonly parts: ParrotOrdinal[]) {}

  public isComplete() {
    return false;
  }

  public getLabel(): [label: string, supported: boolean] {
    return ["", false];
  }

  public getGrain() {
    let rangeGrain: V1TimeGrain | undefined = undefined;

    this.parts.forEach((part) => {
      rangeGrain = getMinGrain(rangeGrain, GrainAliasToV1TimeGrain[part.grain]);
    });

    return rangeGrain;
  }

  public toString() {
    return this.parts.map((part) => `${part.grain}${part.num}`).join(" OF ");
  }
}

export class ParrotTimeStartEndInterval implements ParrotTimeInterval {
  public constructor(
    public readonly start: ParrotPointInTime,
    public readonly end: ParrotPointInTime,
  ) {}

  public isComplete(
    offset: Duration,
    asOfLabel: ParrotTimeAsOfLabel | undefined,
  ) {
    const endOffset = this.end.offset.plus(offset).toObject();
    const grains = Object.keys(endOffset);
    if (grains.length !== 1)
      return this.end.hasSnap() || !!asOfLabel?.snap || grains.length > 0;

    const grain = grains[0];
    const offsetAmount = endOffset[grain];
    if (offsetAmount < 0) return true;
    else if (offsetAmount > 0) return false;

    return this.end.hasSnap() || asOfLabel?.snap === grain;
  }

  public getLabel(offset: Duration): [label: string, supported: boolean] {
    let startOffset = this.start.offset.toObject();
    let endOffset = this.end.offset.toObject();
    const parentOffset = offset.toObject();

    if (this.start?.parts?.[0]?.point instanceof ParrotAbsoluteTime) {
      return [m.time_custom(), true];
    }

    if (
      Object.keys(startOffset).length > 1 ||
      Object.keys(endOffset).length > 1 ||
      Object.keys(parentOffset).length > 1
    ) {
      return ["", false];
    }

    const startGrain = Object.keys(startOffset)[0];
    const endGrain = Object.keys(endOffset)[0];
    if (startGrain && endGrain && startGrain !== endGrain) {
      return ["", false];
    }

    const grain = startGrain || endGrain || "";

    const offsetGrain = Object.keys(parentOffset)[0];
    if (
      isGrainBigger(
        GrainAliasToV1TimeGrain[offsetGrain],
        GrainAliasToV1TimeGrain[grain],
      )
    ) {
      return ["", false];
    }
    startOffset = this.start.offset.plus(offset).toObject();
    endOffset = this.end.offset.plus(offset).toObject();

    const startOffsetAmount = startOffset[grain] ?? 0;
    const endOffsetAmount = endOffset[grain] ?? 0;
    const numDiff = Math.abs(startOffsetAmount - endOffsetAmount);

    const grainSingular = grain.replace(/s$/, "");
    const translatedSingular = translateGrainName(grainSingular);
    const translatedPlural = translateGrainNamePlural(grainSingular);

    if (startOffsetAmount === 0 || startOffsetAmount === 1) {
      if (numDiff === 1) {
        return startOffsetAmount === 0
          ? [m.time_range_this_grain({ grain: translatedSingular }), true]
          : [m.time_range_next_grain({ grain: translatedSingular }), true];
      }
      return [
        m.time_range_next_n_grains({
          count: String(numDiff),
          grains: translatedPlural,
        }),
        true,
      ];
    }

    if (endOffsetAmount === 0 || endOffsetAmount === 1) {
      if (numDiff === 1) {
        return endOffsetAmount === 1
          ? [m.time_range_this_grain({ grain: translatedSingular }), true]
          : [m.time_range_previous_grain({ grain: translatedSingular }), true];
      }
      return [
        m.time_range_last_n_grains({
          count: String(numDiff),
          grains: translatedPlural,
        }),
        true,
      ];
    }

    return ["", false];
  }

  public getGrain() {
    const startRangeGrain = this.start.getGrain();
    const endRangeGrain =
      typeof this.end?.getGrain === "function"
        ? this.end.getGrain()
        : "TIME_GRAIN_DAY";
    const rangeGrain = getMinGrain(startRangeGrain, endRangeGrain);
    return rangeGrain;
  }

  public toString() {
    return `${this.start.toString()} to ${this.end.toString()}`;
  }
}

export class ParrotIsoInterval implements ParrotTimeInterval {
  public constructor(
    private readonly start: ParrotAbsoluteTime,
    private readonly end: ParrotAbsoluteTime | undefined,
  ) {}

  public isComplete() {
    return false;
  }

  public getLabel(): [label: string, supported: boolean] {
    return [m.time_custom(), true];
  }

  // Checks for non-zero time components to determine smallest grain
  // Starts with year as this function is not complete and may
  // run into weekNumber, ordinal and other properties not currently being checked for
  public getGrain() {
    let smallestGrain: V1TimeGrain = V1TimeGrain.TIME_GRAIN_YEAR;

    if (this.start.dateObject.month || this.end?.dateObject.month) {
      smallestGrain = V1TimeGrain.TIME_GRAIN_MONTH;
    }
    if (this.start.dateObject.day || this.end?.dateObject.day) {
      smallestGrain = V1TimeGrain.TIME_GRAIN_DAY;
    }
    if (this.start.dateObject.hour || this.end?.dateObject.hour) {
      smallestGrain = V1TimeGrain.TIME_GRAIN_HOUR;
    }
    if (this.start.dateObject.minute || this.end?.dateObject.minute) {
      smallestGrain = V1TimeGrain.TIME_GRAIN_MINUTE;
    }
    if (
      this.start.dateObject.second ||
      this.end?.dateObject.second ||
      this.start.dateObject.millisecond ||
      this.end?.dateObject.millisecond
    ) {
      smallestGrain = V1TimeGrain.TIME_GRAIN_SECOND;
    }
    return smallestGrain;
  }

  public toString() {
    let timeRange = this.start.toString();
    if (this.end) {
      timeRange += ` to ${this.end.toString()}`;
    }
    return timeRange;
  }
}

export class ParrotAllTimeInterval implements ParrotTimeInterval {
  public isComplete() {
    return false;
  }

  public getLabel(): [label: string, supported: boolean] {
    return [m.time_all_time(), true];
  }

  public getGrain() {
    return undefined;
  }

  public toString() {
    return "inf";
  }
}

export class ParrotLegacyIsoInterval implements ParrotTimeInterval {
  public constructor(
    private readonly dateGrains: ParrotGrain[],
    private readonly timeGrains: ParrotGrain[],
  ) {}

  public isComplete() {
    return false;
  }

  public getLabel(): [label: string, supported: boolean] {
    const isoDuration = this.toString();
    const label = m.time_last_duration({
      duration: humaniseISODuration(isoDuration, false),
    });
    return [label, true];
  }

  public getGrain() {
    const timeGrains = [...this.timeGrains].map((g) =>
      getLegacyGrain(g.grain, true),
    );
    const dateGrains = [...this.dateGrains].map((g) =>
      getLegacyGrain(g.grain, false),
    );

    const allGrains = [...timeGrains, ...dateGrains];
    const isSinglePeriod =
      allGrains.length === 1 &&
      (this.timeGrains[0]?.num === 1 || this.dateGrains[0]?.num === 1);

    if (isSinglePeriod) {
      const grain = allGrains[0];
      return getLowerOrderGrain(grain);
    }

    const smallestGrain = getSmallestGrain([...timeGrains, ...dateGrains]);

    return smallestGrain;
  }

  public toString() {
    const dateParts = this.dateGrains.map(
      ({ grain, num }) => `${num!}${grain.toUpperCase()}`,
    );
    const datePart = "P" + dateParts.join("");
    const timeParts = this.timeGrains.map(
      ({ grain, num }) => `${num!}${grain.toUpperCase()}`,
    );
    const timePart = timeParts.length > 0 ? "T" + timeParts.join("") : "";
    return datePart + timePart;
  }
}

export class ParrotLegacyDaxInterval implements ParrotTimeInterval {
  public constructor(public readonly name: string) {}

  public isComplete() {
    return false;
  }

  public getLabel(): [label: string, supported: boolean] {
    const entry = DEFAULT_TIME_RANGES[this.name];
    if (!entry) return ["", false];
    return [entry.label, true];
  }

  public getGrain() {
    const timeRangeMeta = DEFAULT_TIME_RANGES[this.name] as
      | TimeRangeMeta
      | undefined;

    return timeRangeMeta?.defaultGrain || V1TimeGrain.TIME_GRAIN_DAY;
  }

  public toString() {
    return this.name;
  }
}

export class ParrotPointInTime {
  public readonly offset: Duration;

  public constructor(public readonly parts: ParrotPointInTimeWithSnap[]) {
    let offset = Duration.fromObject({});
    parts.forEach((part) => {
      offset = offset.plus(part.offset);
    });
    this.offset = offset.normalize();
  }

  public getGrain(): V1TimeGrain | undefined {
    let rangeGrain: V1TimeGrain | undefined = undefined;
    this.parts.forEach((part) => {
      rangeGrain = getMinGrain(rangeGrain, part.point.getGrain());
    });
    return rangeGrain;
  }

  public hasLabelledPart() {
    return this.parts.some((p) => p.point instanceof ParrotLabelledPointInTime);
  }

  public getLabelledPart() {
    return this.parts.find((p) => p.point instanceof ParrotLabelledPointInTime);
  }

  public hasSnap() {
    return this.parts.some((p) => p.snaps.length);
  }

  public toString() {
    return this.parts.map((part) => part.toString()).join("");
  }
}

export class ParrotPointInTimeWithSnap {
  public readonly offset = Duration.fromObject({});

  public constructor(
    public readonly point: ParrotPointInTimeVariant,
    public snaps: string[],
  ) {
    if (this.point instanceof ParrotGrainPointInTime) {
      this.offset = this.point.offset;
    }
  }

  public toString() {
    return `${this.point.toString()}${this.snaps.map((s) => "/" + s).join("")}`;
  }
}

interface ParrotPointInTimeVariant {
  getGrain(): V1TimeGrain | undefined;
  toString(): string;
}

export type ParrotOrdinal = {
  grain: string;
  num: number;
};

export class ParrotGrainPointInTime implements ParrotPointInTimeVariant {
  public readonly offset: Duration;

  public constructor(public readonly parts: ParrotGrainPointInTimePart[]) {
    let offset = Duration.fromObject({});
    parts.forEach((part) => {
      if (part.prefix === "+") {
        offset = offset.plus(part.offset);
      } else {
        offset = offset.minus(part.offset);
      }
    });
    this.offset = offset.normalize();
  }

  public getGrain(): V1TimeGrain | undefined {
    let rangeGrain: V1TimeGrain | undefined = undefined;

    this.parts.forEach((part) => {
      part.grains.forEach((grain) => {
        rangeGrain = getMinGrain(
          rangeGrain,
          GrainAliasToV1TimeGrain[grain.grain],
        );
      });
    });

    return rangeGrain;
  }

  public toString() {
    return this.parts.map((part) => part.toString()).join("");
  }
}

export class ParrotGrainPointInTimePart {
  public readonly offset: Duration;

  public constructor(
    public readonly prefix: string,
    public readonly grains: ParrotGrain[],
  ) {
    let offset = Duration.fromObject({});
    grains.forEach(({ grain, num }) => {
      const luxonGrain =
        V1TimeGrainToDateTimeUnit[GrainAliasToV1TimeGrain[grain]];
      if (!luxonGrain || !num) return;
      offset = offset.plus({ [luxonGrain]: num });
    });
    this.offset = offset.normalize();
  }

  public toString() {
    const grainLabels = this.grains
      .map((grain) => {
        const grainPrefix = grain.num ? grain.num : "";
        return `${grainPrefix}${grain.grain}`;
      })
      .join("");
    return `${this.prefix}${grainLabels}`;
  }
}

export class ParrotLabelledPointInTime implements ParrotPointInTimeVariant {
  public constructor(public readonly label: ParrotTimeLabel) {}

  public static postProcessor([label]: string[]) {
    return new ParrotLabelledPointInTime(label.toLowerCase() as ParrotTimeLabel);
  }

  public getGrain(): V1TimeGrain | undefined {
    return undefined;
  }

  public toString() {
    return this.label;
  }
}

export class ParrotAbsoluteTime implements ParrotPointInTimeVariant {
  readonly dateObject: DateObjectUnits = {};

  public constructor(private readonly timeStr: string) {
    const absTimeMatch = absTimeRegex.exec(timeStr);
    if (!absTimeMatch) {
      return;
    }

    if (absTimeMatch.groups?.year)
      this.dateObject.year = Number(absTimeMatch.groups.year);
    if (absTimeMatch.groups?.month)
      this.dateObject.month = Number(absTimeMatch.groups.month);
    if (absTimeMatch.groups?.day)
      this.dateObject.day = Number(absTimeMatch.groups.day);
    if (absTimeMatch.groups?.hour)
      this.dateObject.hour = Number(absTimeMatch.groups.hour);
    if (absTimeMatch.groups?.minute)
      this.dateObject.minute = Number(absTimeMatch.groups.minute);
    if (absTimeMatch.groups?.second)
      this.dateObject.second = Number(absTimeMatch.groups.second);
  }

  public static postProcessor(args: string[]) {
    return new ParrotAbsoluteTime(args.flat().join(""));
  }

  public getGrain(): V1TimeGrain | undefined {
    return undefined;
  }

  public getLabel() {
    const date = DateTime.fromObject(this.dateObject, { zone: "utc" });

    if (
      this.dateObject.hour ||
      this.dateObject.minute ||
      this.dateObject.second
    ) {
      return date.toLocaleString(DateTime.DATETIME_MED);
    }

    if (this.dateObject.day) {
      return date.toLocaleString(DateTime.DATE_MED);
    }

    if (this.dateObject.month) {
      return date.toLocaleString({ month: "short", year: "numeric" });
    }

    return this.timeStr;
  }

  public toString() {
    return this.timeStr;
  }
}

type ParrotGrain = {
  grain: string;
  num?: number;
};

export function capitalizeFirstChar(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getLegacyGrain(grain: string, time: boolean) {
  const isValid = grain in GrainAliasToV1TimeGrain;

  if (!isValid) return V1TimeGrain.TIME_GRAIN_UNSPECIFIED;

  if (!time || (grain !== "M" && grain !== "m")) {
    return GrainAliasToV1TimeGrain[grain as TimeGrainAlias];
  } else {
    return V1TimeGrain.TIME_GRAIN_MINUTE;
  }
}
