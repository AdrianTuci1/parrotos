import {
  overrideParrotTimeRef,
  parseParrotTime,
} from "@statsparrot/web-common/features/dashboards/url-state/time-ranges/parser";
import {
  capitalizeFirstChar,
  type ParrotTimeAsOfLabel,
  ParrotTimeLabel,
} from "@statsparrot/web-common/features/dashboards/url-state/time-ranges/ParrotTime.ts";
import {
  getLowerOrderGrain,
  GrainAliasToV1TimeGrain,
} from "@statsparrot/web-common/lib/time/new-grains";
import { V1TimeGrain } from "@statsparrot/web-common/runtime-client";
import type { DateTimeUnit } from "luxon";
import nearley from "nearley";
import { describe, expect, it } from "vitest";
import grammar from "./statsparrot-time.js";

const GRAINS = ["Y", "Q", "M", "W", "D", "H", "m", "s"] as const;
const GRAIN_TO_LUXON: Record<string, DateTimeUnit> = {
  s: "second",
  m: "minute",
  H: "hour",
  D: "day",
  W: "week",
  M: "month",
  Q: "quarter",
  Y: "year",
};

type TestCase = [
  syntax: string,
  label: string,
  complete: boolean,
  rangeGrain: V1TimeGrain | undefined,
  byGrain: V1TimeGrain | undefined,
];

function getSinglePeriodTestCases(): TestCase[] {
  return GRAINS.map((g) => {
    const protoGrain = GrainAliasToV1TimeGrain[g];

    const current = `This ${GRAIN_TO_LUXON[g]}`;
    const previous = `Previous ${GRAIN_TO_LUXON[g]}`;

    return <TestCase[]>[
      [`ref/${g} to ref/${g}+1${g}`, current, false, protoGrain, undefined],
      [
        `1${g} as of watermark/${g}+1${g}`,
        current,
        false,
        protoGrain,
        undefined,
      ],
      [
        `1${g} as of +1${g} as of watermark/${g}`,
        current,
        false,
        protoGrain,
        undefined,
      ],

      [`ref/${g}-1${g} to ref/${g}`, previous, true, protoGrain, undefined],
      [`1${g} as of watermark/${g}`, previous, true, protoGrain, undefined],
      [
        `-1${g} to ref as of watermark/${g}`,
        previous,
        true,
        protoGrain,
        undefined,
      ],
    ];
  }).flat();
}

function getMultiPeriodTestCases(n: number): TestCase[] {
  return GRAINS.map((g) => {
    const protoGrain = GrainAliasToV1TimeGrain[g];
    const last = `Last ${n} ${GRAIN_TO_LUXON[g]}s`;
    return <TestCase[]>[
      [
        `-7${g} to ref as of watermark/${g}+1${g}`,
        last,
        false,
        protoGrain,
        undefined,
      ],
      [
        `-7${g} to ref as of +1${g} as of watermark/${g}`,
        last,
        false,
        protoGrain,
        undefined,
      ],
      [`-7${g} to ref as of watermark/${g}`, last, true, protoGrain, undefined],
      [`7${g}`, last, false, protoGrain, undefined],
    ];
  }).flat();
}

function getPeriodToDateTestCases(): TestCase[] {
  return GRAINS.map((g) => {
    const protoGrain = getLowerOrderGrain(GrainAliasToV1TimeGrain[g]);
    const label = capitalizeFirstChar(`${GRAIN_TO_LUXON[g]} to date`);
    return <TestCase[]>[
      [`${g}TD as of watermark/${g}`, label, true, protoGrain, undefined],
      [
        `${g}TD as of watermark/${g}+1${g}`,
        label,
        false,
        protoGrain,
        undefined,
      ],

      [`${g}TD as of watermark/h`, label, true, protoGrain, undefined],

      [`${g}TD`, label, false, protoGrain, undefined],
    ];
  }).flat();
}

function getLegacyISOTestCases(): TestCase[] {
  return [
    [
      `P2M3D`,
      "Last 2 months and 3 days",
      false,
      V1TimeGrain.TIME_GRAIN_DAY,
      undefined,
    ],
    [
      `PT2H3M`,
      "Last 2 hours and 3 minutes",
      false,
      V1TimeGrain.TIME_GRAIN_MINUTE,
      undefined,
    ],
    [
      `P2M3DT2H3M`,
      "Last 2 months, 3 days, 2 hours and 3 minutes",
      false,
      V1TimeGrain.TIME_GRAIN_MINUTE,
      undefined,
    ],
  ];
}

function getLegacyDAXTestCases(): TestCase[] {
  return [
    ["statsparrot-TD", "Today", false, V1TimeGrain.TIME_GRAIN_HOUR, undefined],
    ["statsparrot-WTD", "Week to Date", false, V1TimeGrain.TIME_GRAIN_DAY, undefined],
    [
      "statsparrot-QTD",
      "Quarter to Date",
      false,
      V1TimeGrain.TIME_GRAIN_WEEK,
      undefined,
    ],
    ["statsparrot-MTD", "Month to Date", false, V1TimeGrain.TIME_GRAIN_DAY, undefined],
    ["statsparrot-YTD", "Year to Date", false, V1TimeGrain.TIME_GRAIN_DAY, undefined],

    ["statsparrot-PDC", "Yesterday", false, V1TimeGrain.TIME_GRAIN_HOUR, undefined],
    ["statsparrot-PWC", "Previous week", false, V1TimeGrain.TIME_GRAIN_DAY, undefined],
    [
      "statsparrot-PQC",
      "Previous quarter",
      false,
      V1TimeGrain.TIME_GRAIN_DAY,
      undefined,
    ],
    [
      "statsparrot-PMC",
      "Previous month",
      false,
      V1TimeGrain.TIME_GRAIN_DAY,
      undefined,
    ],
    ["statsparrot-PYC", "Previous year", false, V1TimeGrain.TIME_GRAIN_DAY, undefined],
  ];
}

describe("statsparrot time", () => {
  describe("positive cases", () => {
    const Cases: TestCase[] = [
      ...getSinglePeriodTestCases(),
      ...getMultiPeriodTestCases(7),
      ...getPeriodToDateTestCases(),
      ...getLegacyISOTestCases(),
      ...getLegacyDAXTestCases(),
      [
        "-5W4M3Q2Y to -4W3M2Q1Y",
        "-5W4M3Q2Y to -4W3M2Q1Y",
        true,
        V1TimeGrain.TIME_GRAIN_WEEK,
        undefined,
      ],
      [
        "-5W-4M-3Q-2Y to -4W-3M-2Q-1Y",
        "-5W-4M-3Q-2Y to -4W-3M-2Q-1Y",
        true,
        V1TimeGrain.TIME_GRAIN_WEEK,
        undefined,
      ],

      [
        `7D as of watermark/h+1h`,
        `Last 7 days`,
        false,
        V1TimeGrain.TIME_GRAIN_DAY,
        undefined,
      ],

      [
        `2025-02-20T01:23:45Z,2025-07-15T02:34:50Z`,
        `Custom`,
        false,
        V1TimeGrain.TIME_GRAIN_SECOND,
        undefined,
      ],

      ["inf", "All time", false, undefined, undefined],
    ];

    const compiledGrammar = nearley.Grammar.fromCompiled(grammar);
    for (const [statsparrotTime, label, complete, rangeGrain, byGrain] of Cases) {
      it(statsparrotTime, () => {
        const parser = new nearley.Parser(compiledGrammar);
        parser.feed(statsparrotTime);
        // assert that there is only match. this ensures unambiguous grammar.
        expect(parser.results).length(1);

        const rt = parseParrotTime(statsparrotTime);
        expect(rt).not.toBeUndefined();
        expect(rt.getLabel()).toEqual(label);
        expect(rt.isComplete).toEqual(complete);
        expect(rt.rangeGrain).toEqual(rangeGrain);
        expect(rt.byGrain).toEqual(byGrain);

        const serialisedParrotTime = rt.toString();
        const newRt = parseParrotTime(serialisedParrotTime);
        expect(newRt.toString()).toEqual(serialisedParrotTime);
      });
    }
  });

  describe("override ref", () => {
    const Cases: [
      statsparrotTime: string,
      refOverride: string,
      updatedParrotTime: string,
    ][] = [
      ["7D AS OF watermark/Y", "watermark/Y+1Y", "7D AS OF watermark/Y+1Y"],
      ["7D AS OF watermark/Y+1Y", "watermark/Y", "7D AS OF watermark/Y"],
      ["7D AS OF watermark/Y", "now/Y", "7D AS OF now/Y"],
    ];

    for (const [statsparrotTime, refOverride, updatedParrotTime] of Cases) {
      it(`${statsparrotTime} <> ${refOverride}`, () => {
        const rt = parseParrotTime(statsparrotTime);
        overrideParrotTimeRef(rt, refOverride);
        expect(rt.toString(), updatedParrotTime);
      });
    }
  });

  describe("as of label", () => {
    const Cases: [
      statsparrotTime: string,
      asOfLabel: ParrotTimeAsOfLabel | undefined,
    ][] = [
      ["7D", undefined],
      ["7D as of -2D", undefined],
      [
        "7D as of -2D as of watermark",
        { label: ParrotTimeLabel.Watermark, snap: undefined, offset: 0 },
      ],
      [
        "7D as of -2D as of watermark/D",
        { label: ParrotTimeLabel.Watermark, snap: "D", offset: 0 },
      ],
      [
        "7D as of -2D as of watermark/D+1D",
        { label: ParrotTimeLabel.Watermark, snap: "D", offset: 1 },
      ],
      [
        "7D as of -2D as of watermark/D+1h",
        { label: ParrotTimeLabel.Watermark, snap: "D", offset: 0 },
      ],
      [
        "7D as of -2D as of watermark/h+1h",
        { label: ParrotTimeLabel.Watermark, snap: "h", offset: 1 },
      ],
    ];

    for (const [statsparrotTime, asOfLabel] of Cases) {
      it(statsparrotTime, () => {
        const rt = parseParrotTime(statsparrotTime);
        expect(rt.asOfLabel).toEqual(asOfLabel);
      });
    }
  });
});
