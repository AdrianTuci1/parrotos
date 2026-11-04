package athena

import (
	"fmt"
	"strings"
	"time"

	runtimev1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/runtime/v1"
	"github.com/staticlabs/statsparrot/runtime/drivers"
)

type dialect struct {
	drivers.BaseDialect
}

var DialectAthena drivers.Dialect = func() drivers.Dialect {
	d := &dialect{}
	d.BaseDialect = drivers.NewBaseDialect(drivers.DialectNameAthena, drivers.DoubleQuotesEscapeIdentifier, drivers.DoubleQuotesEscapeIdentifier)
	return d
}()

// GetTimeDimensionParameter implements drivers.Dialect.
//
// Athena passes execution parameters to the engine as string literals, so a
// bare "?" against a timestamp column is compared as varchar and fails with a
// type mismatch. Casting the parameter keeps the comparison typed.
func (d *dialect) GetTimeDimensionParameter(typeCode runtimev1.Type_Code) string {
	if typeCode == runtimev1.Type_CODE_DATE {
		return "CAST(? AS DATE)"
	}
	return "CAST(? AS TIMESTAMP)"
}

// dateUnit maps a time grain to the unit string Athena's date functions take.
// Athena has no millisecond truncation, so that grain is rejected instead of
// silently returning a coarser bucket.
func (d *dialect) dateUnit(grain runtimev1.TimeGrain) (string, error) {
	unit := strings.ToLower(d.ConvertToDateTruncSpecifier(grain))
	if unit == "" || unit == "millisecond" {
		return "", fmt.Errorf("date unit for grain %s is not supported in athena", grain)
	}
	return unit, nil
}

func (d *dialect) DateTruncExpr(dim *runtimev1.MetricsViewSpec_Dimension, grain runtimev1.TimeGrain, tz string, firstDayOfWeek, firstMonthOfYear int) (string, error) {
	unit, err := d.dateUnit(grain)
	if err != nil {
		return "", err
	}

	if tz == "UTC" || tz == "Etc/UTC" {
		tz = ""
	}
	if tz != "" {
		if _, err := time.LoadLocation(tz); err != nil {
			return "", fmt.Errorf("invalid time zone %q: %w", tz, err)
		}
	}

	var expr string
	if dim.Expression != "" {
		expr = fmt.Sprintf("(%s)", dim.Expression)
	} else {
		expr = d.EscapeIdentifier(dim.Column)
	}

	// Stored timestamps are UTC. For a non-UTC view, read the instant as UTC and
	// render it as wall time in the view's zone before truncating, matching the
	// buckets other dialects produce.
	local := fmt.Sprintf("CAST(%s AS TIMESTAMP)", expr)
	if tz != "" {
		local = fmt.Sprintf("(CAST(%s AS TIMESTAMP) AT TIME ZONE 'UTC') AT TIME ZONE '%s'", expr, tz)
	}

	// Athena's date_trunc always starts weeks on Monday and years in January, so
	// align those buckets when the metrics view asks for another start.
	shiftUnit := ""
	shift := 0
	if grain == runtimev1.TimeGrain_TIME_GRAIN_WEEK && firstDayOfWeek > 1 {
		shiftUnit = "day"
		shift = 8 - firstDayOfWeek
	} else if grain == runtimev1.TimeGrain_TIME_GRAIN_YEAR && firstMonthOfYear > 1 {
		shiftUnit = "month"
		shift = 13 - firstMonthOfYear
	}

	if shift != 0 {
		local = fmt.Sprintf("date_add('%s', %d, %s)", shiftUnit, shift, local)
	}

	trunc := fmt.Sprintf("date_trunc('%s', %s)", unit, local)

	if shift != 0 {
		trunc = fmt.Sprintf("date_add('%s', -%d, %s)", shiftUnit, shift, trunc)
	}

	return trunc, nil
}

func (d *dialect) DateDiff(grain runtimev1.TimeGrain, t1, t2 time.Time) (string, error) {
	unit, err := d.dateUnit(grain)
	if err != nil {
		return "", err
	}

	const layout = "2006-01-02 15:04:05.000"
	return fmt.Sprintf("date_diff('%s', TIMESTAMP '%s', TIMESTAMP '%s')", unit, t1.UTC().Format(layout), t2.UTC().Format(layout)), nil
}

func (d *dialect) IntervalSubtract(tsExpr, unitExpr string, grain runtimev1.TimeGrain) (string, error) {
	unit, err := d.dateUnit(grain)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("date_add('%s', -1 * CAST((%s) AS BIGINT), CAST(%s AS TIMESTAMP))", unit, unitExpr, tsExpr), nil
}
