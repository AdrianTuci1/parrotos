package athena

import (
	"testing"
	"time"

	runtimev1 "github.com/staticlabs/statsparrot/proto/gen/statsparrot/runtime/v1"
	"github.com/stretchr/testify/require"
)

// Athena substitutes execution parameters as text, so a Go time has to be
// rendered in a format the engine parses back into a timestamp.
func TestFormatExecutionParameter(t *testing.T) {
	ts := time.Date(2026, 11, 4, 20, 52, 25, 817042000, time.UTC)

	tests := []struct {
		name string
		in   any
		want string
	}{
		{name: "timestamp", in: ts, want: "2026-11-04 20:52:25.817042"},
		{name: "timestamp in another zone", in: time.Date(2026, 11, 4, 22, 52, 25, 817042000, time.FixedZone("EET", 2*60*60)), want: "2026-11-04 20:52:25.817042"},
		{name: "timestamp without fraction", in: time.Date(2026, 11, 4, 20, 52, 25, 0, time.UTC), want: "2026-11-04 20:52:25"},
		{name: "string", in: "app-start", want: "app-start"},
		{name: "integer", in: 42, want: "42"},
		{name: "float", in: 1.5, want: "1.5"},
		{name: "boolean", in: true, want: "true"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			require.Equal(t, test.want, formatExecutionParameter(test.in))
		})
	}
}

func TestGetTimeDimensionParameter(t *testing.T) {
	d := DialectAthena
	require.Equal(t, "CAST(? AS TIMESTAMP)", d.GetTimeDimensionParameter(runtimev1.Type_CODE_TIMESTAMP))
	require.Equal(t, "CAST(? AS DATE)", d.GetTimeDimensionParameter(runtimev1.Type_CODE_DATE))
}
