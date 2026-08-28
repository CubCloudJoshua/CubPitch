import type { TableSpec } from '@cubpitch/core';
import type { ReactNode } from 'react';

/**
 * A projection table, edited as a grid.
 *
 * Financials are the one slide where a spreadsheet shape is the honest one: a
 * few labelled rows across a few periods, with the row that matters marked. So
 * this edits the table as a grid of text cells rather than a form, because that
 * is how the author already holds the numbers in their head. Cells stay strings
 * because "74%" and "($1.2M)" are how a founder writes a financial, not what a
 * number type would keep.
 */

function emptyTable(): TableSpec {
  return {
    columns: [
      { label: '', align: 'left' },
      { label: 'Y1', align: 'right' },
      { label: 'Y2', align: 'right' },
      { label: 'Y3', align: 'right' },
    ],
    rows: [
      { cells: ['Revenue', '', '', ''], emphasis: false },
      { cells: ['Gross margin', '', '', ''], emphasis: false },
      { cells: ['Net burn', '', '', ''], emphasis: true },
    ],
  };
}

export function TableField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TableSpec | undefined;
  onChange: (table: TableSpec | undefined) => void;
}): ReactNode {
  if (!value) {
    return (
      <div className="field">
        <p className="label">{label}</p>
        <button className="btn" onClick={() => onChange(emptyTable())}>
          + Add a table
        </button>
      </div>
    );
  }

  const table = value;
  const columns = table.columns.length;

  const setColumn = (index: number, text: string): void =>
    onChange({ ...table, columns: table.columns.map((col, i) => (i === index ? { ...col, label: text } : col)) });

  const setCell = (rowIndex: number, cellIndex: number, text: string): void =>
    onChange({
      ...table,
      rows: table.rows.map((row, i) =>
        i === rowIndex ? { ...row, cells: row.cells.map((cell, j) => (j === cellIndex ? text : cell)) } : row,
      ),
    });

  const addRow = (): void =>
    onChange({ ...table, rows: [...table.rows, { cells: Array.from({ length: columns }, () => ''), emphasis: false }] });

  const removeRow = (index: number): void => onChange({ ...table, rows: table.rows.filter((_, i) => i !== index) });

  const toggleEmphasis = (index: number): void =>
    onChange({ ...table, rows: table.rows.map((row, i) => (i === index ? { ...row, emphasis: !row.emphasis } : row)) });

  const addColumn = (): void =>
    onChange({
      ...table,
      columns: [...table.columns, { label: `Y${columns}`, align: 'right' }],
      rows: table.rows.map((row) => ({ ...row, cells: [...row.cells, ''] })),
    });

  const removeColumn = (index: number): void =>
    onChange({
      ...table,
      columns: table.columns.filter((_, i) => i !== index),
      rows: table.rows.map((row) => ({ ...row, cells: row.cells.filter((_, i) => i !== index) })),
    });

  return (
    <div className="field">
      <div className="card__head">
        <p className="label">{label}</p>
        <span style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn--icon" onClick={addColumn} title="Add a column">
            +col
          </button>
          <button className="btn btn--icon btn--danger" onClick={() => onChange(undefined)} title="Remove the table">
            ×
          </button>
        </span>
      </div>

      <div className="tbl-edit">
        <table>
          <thead>
            <tr>
              {table.columns.map((col, index) => (
                <th key={index}>
                  <input
                    className="tbl-edit__cell tbl-edit__head"
                    value={col.label}
                    placeholder={index === 0 ? 'Row' : `Col ${index}`}
                    onChange={(event) => setColumn(index, event.target.value)}
                  />
                  {columns > 1 ? (
                    <button className="tbl-edit__x" onClick={() => removeColumn(index)} title="Remove column">
                      ×
                    </button>
                  ) : null}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={row.emphasis ? 'tbl-edit__row--emph' : ''}>
                {Array.from({ length: columns }, (_, cellIndex) => (
                  <td key={cellIndex}>
                    <input
                      className="tbl-edit__cell"
                      value={row.cells[cellIndex] ?? ''}
                      onChange={(event) => setCell(rowIndex, cellIndex, event.target.value)}
                    />
                  </td>
                ))}
                <td className="tbl-edit__actions">
                  <button
                    className="tbl-edit__x"
                    onClick={() => toggleEmphasis(rowIndex)}
                    title={row.emphasis ? 'Un-emphasise' : 'Emphasise this row'}
                    style={{ color: row.emphasis ? 'var(--ui-accent-bright)' : undefined }}
                  >
                    ●
                  </button>
                  <button className="tbl-edit__x" onClick={() => removeRow(rowIndex)} title="Remove row">
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn" onClick={addRow} style={{ marginTop: 8 }}>
        + Add a row
      </button>

      <input
        className="input"
        style={{ marginTop: 8 }}
        placeholder="Source"
        value={table.source ?? ''}
        onChange={(event) => onChange({ ...table, source: event.target.value })}
      />
    </div>
  );
}
