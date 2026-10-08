package metricsview

import (
	"time"

	"github.com/staticlabs/statsparrot/runtime/pkg/statspartime"
)

// ResolveMaxQueryTimeRange resolves a metrics view's max_query_time_range property to a duration relative to now.
// Returns 0 for empty or unparseable input.
func ResolveMaxQueryTimeRange(maxQueryTimeRange string, now time.Time) time.Duration {
	if maxQueryTimeRange == "" {
		return 0
	}
	expr, err := statspartime.Parse(maxQueryTimeRange, statspartime.ParseOptions{})
	if err != nil {
		return 0
	}
	start, end, _ := expr.Eval(statspartime.EvalOptions{
		Now:       now,
		MinTime:   now,
		MaxTime:   now,
		Watermark: now,
	})
	return end.Sub(start)
}
