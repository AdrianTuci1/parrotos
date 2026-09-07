/**
 * Build a mock pivot dataset: row dimension × (measure columns, or a column
 * dimension cross-tabulated with measures).
 *
 * `getRows(dimension)` returns the per-category rows for a dimension. The mock
 * adapter only exposes per-dimension margins, so a cross-tab distributes each
 * cell deterministically to keep the row totals intact.
 */
export function buildMockPivotData(getRows, rowDim, colDim, measures) {
  const rowRows = getRows(rowDim);
  if (!colDim) {
    const columns = measures.map((m) => ({
      label: m.displayName || m.name,
      value: m.name,
      measure: m,
    }));
    const rows = rowRows.map((r) => ({
      label: r[rowDim],
      cells: columns.map((c) => r[c.value] ?? null),
    }));
    return { columns, rows };
  }

  const colRows = getRows(colDim);
  const colValues = colRows.map((c) => c[colDim]);
  const columns = [];
  for (const cv of colValues) {
    for (const m of measures) {
      columns.push({
        label: `${cv} · ${m.displayName || m.name}`,
        value: `${cv}::${m.name}`,
        col: cv,
        measure: m,
      });
    }
  }
  // Weight each column value by its share of each measure's total, so a row's
  // pivot cells always add back to the row's own margin for that measure.
  const weights = {};
  for (const m of measures) {
    const total = colRows.reduce((s, c) => s + (c[m.name] ?? 0), 0) || 1;
    for (const cv of colValues) {
      const cval = colRows.find((c) => c[colDim] === cv)?.[m.name] ?? 0;
      weights[cv] = weights[cv] || {};
      weights[cv][m.name] = cval / total;
    }
  }
  const rows = rowRows.map((r) => ({
    label: r[rowDim],
    cells: columns.map((c) => {
      const base = r[c.measure.name] ?? 0;
      return Number((base * weights[c.col][c.measure.name]).toFixed(2));
    }),
  }));
  return { columns, rows };
}
