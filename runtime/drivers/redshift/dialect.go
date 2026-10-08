package redshift

import (
	"github.com/staticlabs/statsparrot/runtime/drivers"
)

type dialect struct {
	drivers.BaseDialect
}

var DialectRedshift drivers.Dialect = func() drivers.Dialect {
	d := &dialect{}
	d.BaseDialect = drivers.NewBaseDialect(drivers.DialectNameRedshift, drivers.DoubleQuotesEscapeIdentifier, drivers.DoubleQuotesEscapeIdentifier)
	return d
}()
