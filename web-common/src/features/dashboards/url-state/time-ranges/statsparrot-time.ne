@preprocessor esmodule
@builtin "whitespace.ne"
@builtin "string.ne"

@{%
  import {
    ParrotTime,

    ParrotShorthandInterval,
    ParrotPeriodToGrainInterval,
    ParrotTimeStartEndInterval,
    ParrotTimeOrdinalInterval,
    ParrotIsoInterval,
    ParrotLegacyIsoInterval,
    ParrotLegacyDaxInterval,
    ParrotAllTimeInterval,

    ParrotPointInTime,
    ParrotPointInTimeWithSnap,
    ParrotLabelledPointInTime,
    ParrotGrainPointInTime,
    ParrotGrainPointInTimePart,
    ParrotAbsoluteTime,
  } from "./ParrotTime.ts"
%}

statsparrot_time => new_statsparrot_time {% id %}
           | old_statsparrot_time {% id %}

new_statsparrot_time => interval_with_grain                            {% id %}
               | interval_with_grain _ "tz" _ timezone_modifier {% ([rt, , , , tz]) => rt.withTimezone(tz) %}

interval_with_grain => interval_with_anchor_override _ "by"i _ grain {% ([rt, , , , grain]) => rt.withGrain(grain) %}
                     | interval_with_anchor_override                 {% id %}

interval_with_anchor_override => interval anchor_override:*      {% ([interval, anchorOverrides]) => new ParrotTime(interval).withAnchorOverrides(anchorOverrides) %}
anchor_override               => _ "as"i _ "of"i _ point_in_time {% ([, , , , , pointInTime]) => pointInTime %}

interval => shorthand_interval         {% id %}
          | period_to_grain_interval   {% id %}
          | start_end_interval         {% id %}
          | ordinal_interval           {% id %}
          | iso_interval               {% id %}
          | "inf"i                     {% () => new ParrotAllTimeInterval() %}

shorthand_interval => grain_duration {% ([parts]) => new ParrotShorthandInterval(parts) %}

period_to_grain_interval => period_to_grain {% ([grain]) => new ParrotPeriodToGrainInterval(grain) %}

ordinal_interval => ordinal (_ "of"i _ ordinal):* {% ([part, rest]) => new ParrotTimeOrdinalInterval([part, ...rest.map(([, , , p]) => p)]) %}

start_end_interval => point_in_time _ "to"i _ point_in_time {% ([start, , , , end]) => new ParrotTimeStartEndInterval(start, end) %}

iso_interval => abs_time _ "to"i _ abs_time {% ([start, , , , end]) => new ParrotIsoInterval(start, end) %}
              | abs_time _ "/" _ abs_time   {% ([start, , , , end]) => new ParrotIsoInterval(start, end) %}
              | abs_time _ "," _ abs_time   {% ([start, , , , end]) => new ParrotIsoInterval(start, end) %}
              | abs_time                    {% ([start]) => new ParrotIsoInterval(start, undefined) %}

point_in_time              => point_in_time_with_snap:* point_in_time_without_snap {% ([points, last]) => new ParrotPointInTime([...points, last]) %}
                            | point_in_time_with_snap                              {% ([point]) => new ParrotPointInTime([point]) %}
point_in_time_with_snap    => point_in_time_variants _ "/" _ grain _ "/" _ grain   {% ([point, , , , firstGrain, , , , secondGrain]) => new ParrotPointInTimeWithSnap(point, [firstGrain, secondGrain]) %}
                            | point_in_time_variants _ "/" _ grain                 {% ([point, , , , grain]) => new ParrotPointInTimeWithSnap(point, [grain]) %}
point_in_time_without_snap => point_in_time_variants                               {% ([point]) => new ParrotPointInTimeWithSnap(point, []) %}

point_in_time_variants => grain_point_in_time   {% id %}
                        | labeled_point_in_time {% id %}
                        | abs_time              {% id %}

grain_point_in_time      => grain_point_in_time_part:+ {% ([parts]) => new ParrotGrainPointInTime([...parts]) %}
grain_point_in_time_part => prefix _ grain_duration    {% ([prefix, _, grains]) => new ParrotGrainPointInTimePart(prefix, grains) %}

labeled_point_in_time => "earliest"i  {% ParrotLabelledPointInTime.postProcessor %}
                       | "latest"i    {% ParrotLabelledPointInTime.postProcessor %}
                       | "now"i       {% ParrotLabelledPointInTime.postProcessor %}
                       | "watermark"i {% ParrotLabelledPointInTime.postProcessor %}
                       | "ref"i       {% ParrotLabelledPointInTime.postProcessor %}

ordinal => grain num {% ([grain, num]) => ({num, grain}) %}

grain_duration      => grain_duration_part:+ {% ([parts]) => parts %}
grain_duration_part => num grain             {% ([num, grain]) => ({num, grain}) %}

period_to_grain => grain "TD" {% ([grain]) => grain %}

abs_time => [\d] [\d] [\d] [\d] [\-] [\d] [\d] [\-] [\d] [\d] "T" [\d] [\d] [:] [\d] [\d] [:] [\d] [\d] [.] [\d]:+ "Z" {% ParrotAbsoluteTime.postProcessor %}
          | [\d] [\d] [\d] [\d] [\-] [\d] [\d] [\-] [\d] [\d] "T" [\d] [\d] [:] [\d] [\d] [:] [\d] [\d] "Z"            {% ParrotAbsoluteTime.postProcessor %}
          | [\d] [\d] [\d] [\d] [\-] [\d] [\d] [\-] [\d] [\d] "T" [\d] [\d] [:] [\d] [\d]                              {% ParrotAbsoluteTime.postProcessor %}
          | [\d] [\d] [\d] [\d] [\-] [\d] [\d] [\-] [\d] [\d] "T" [\d] [\d]                                            {% ParrotAbsoluteTime.postProcessor %}
          | [\d] [\d] [\d] [\d] [\-] [\d] [\d] [\-] [\d] [\d]                                                          {% ParrotAbsoluteTime.postProcessor %}
          | [\d] [\d] [\d] [\d] [\-] [\d] [\d]                                                                         {% ParrotAbsoluteTime.postProcessor %}
          | [\d] [\d] [\d] [\d]                                                                                        {% ParrotAbsoluteTime.postProcessor %}

timezone_modifier => [0-9a-zA-Z/+\-_]:+ {% ([args]) => args.join("") %}

old_statsparrot_time => iso_time {% ([legacyIso]) => new ParrotTime(legacyIso) %}
               | dax_time {% ([legacyDax]) => new ParrotTime(new ParrotLegacyDaxInterval(legacyDax)) %}

iso_time => "P" iso_date_part:+ "T" iso_time_part:+ {% ([, dateGrains, , timeGrains]) => new ParrotLegacyIsoInterval(dateGrains, timeGrains) %}
          | "P" iso_date_part:+                     {% ([, dateGrains]) => new ParrotLegacyIsoInterval(dateGrains, []) %}
          | "PT" iso_time_part:+                    {% ([, timeGrains]) => new ParrotLegacyIsoInterval([], timeGrains) %}

iso_date_part => num date_grains {% ([num, grain]) => ({num, grain}) %}
iso_time_part => num time_grains {% ([num, grain]) => ({num, grain}) %}

dax_time => "statsparrot-" dax_notations    {% (args) => args.join("") %}
dax_notations => dax_to_date "TD"    {% (args) => args.join("") %}
               | "TD"                {% id %}
               | "P" date_grains "C" {% (args) => args.join("") %}
               | "PP"                {% id %}
               | "P" date_grains     {% (args) => args.join("") %}

prefix => [+\-] {% id %}

num => [0-9]:+ {% ([args]) => Number(args.join("")) %}

grain => [sSmhHdDwWqQMyY] {% id %}

date_grains => [DWQMY] {% id %}
time_grains => [SMH] {% id %}
dax_to_date => [WQMY] {% id %}
