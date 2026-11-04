package athena

import (
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
