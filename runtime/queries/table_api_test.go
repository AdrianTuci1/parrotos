package queries_test

import (
	"context"
	"testing"

	_ "github.com/staticlabs/statsparrot/runtime/drivers/duckdb"
	"github.com/staticlabs/statsparrot/runtime/queries"
	"github.com/staticlabs/statsparrot/runtime/testruntime"
	"github.com/stretchr/testify/require"
)

func BenchmarkTableCardinality(b *testing.B) {
	rt, instanceID := testruntime.NewInstanceForProject(b, "ad_bids")
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		q := &queries.TableCardinality{
			TableName: "ad_bids",
		}
		err := q.Resolve(context.Background(), rt, instanceID, 0)
		require.NoError(b, err)
		require.NotEmpty(b, q.Result)
	}
}
