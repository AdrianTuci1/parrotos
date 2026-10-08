package athena

import (
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
