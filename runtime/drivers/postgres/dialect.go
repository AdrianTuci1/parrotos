package postgres

import (
	"github.com/staticlabs/statsparrot/runtime/drivers"
)

type dialect struct {
	drivers.BaseDialect
}

var DialectPostgres drivers.Dialect = func() drivers.Dialect {
	d := &dialect{}
	d.BaseDialect = drivers.NewBaseDialect(drivers.DialectNamePostgres, drivers.DoubleQuotesEscapeIdentifier, drivers.DoubleQuotesEscapeIdentifier)
	return d
}()
