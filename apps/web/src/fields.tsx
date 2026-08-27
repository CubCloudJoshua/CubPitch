import type { ReactNode } from 'react';

/**
 * Form primitives.
 *
 * Small and dumb on purpose. The inspector is a form over a typed document, so
 * these know how to edit a string, a list of strings, and a list of objects,
 * and nothing about slides.
 */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): ReactNode {
  return (
    <div className="field">
      <p className="label">{label}</p>
      {children}
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function Text({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}): ReactNode {
  return (
    <Field label={label} hint={hint}>
      <input className="input" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

export function Para({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}): ReactNode {
  return (
    <Field label={label} hint={hint}>
      <textarea
        className="textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}): ReactNode {
  return (
    <Field label={label}>
      <select className="select" style={{ width: '100%' }} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }): ReactNode {
  return (
    <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
      <span className="label" style={{ marginBottom: 0 }}>
        {label}
      </span>
    </div>
  );
}

/** A list of plain strings. */
export function StringList({
  label,
  values,
  onChange,
  placeholder,
  addLabel = 'Add',
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}): ReactNode {
  const set = (index: number, value: string): void => onChange(values.map((item, i) => (i === index ? value : item)));
  const remove = (index: number): void => onChange(values.filter((_, i) => i !== index));

  return (
    <Field label={label}>
      {values.map((value, index) => (
        <div className="list__row" key={index}>
          <input className="input" value={value} placeholder={placeholder} onChange={(event) => set(index, event.target.value)} />
          <button className="btn btn--icon btn--danger" onClick={() => remove(index)} title="Remove">
            ×
          </button>
        </div>
      ))}
      <button className="btn" onClick={() => onChange([...values, ''])}>
        + {addLabel}
      </button>
    </Field>
  );
}

/**
 * A list of objects, each rendered by the caller.
 *
 * Reordering matters here: a traction slide renders strongest-evidence-first
 * regardless of order, but a workflow, a roadmap and a use-of-funds table all
 * mean something by their sequence.
 */
export function ObjectList<T>({
  label,
  items,
  onChange,
  create,
  title,
  children,
  addLabel = 'Add',
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  title: (item: T, index: number) => string;
  children: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  addLabel?: string;
}): ReactNode {
  const update = (index: number, patch: Partial<T>): void =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const remove = (index: number): void => onChange(items.filter((_, i) => i !== index));
  const move = (index: number, delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (moved !== undefined) next.splice(target, 0, moved);
    onChange(next);
  };

  return (
    <div className="field">
      <p className="label">{label}</p>
      {items.map((item, index) => (
        <div className="card" key={index}>
          <div className="card__head">
            <span className="label">{title(item, index)}</span>
            <span style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn--icon" onClick={() => move(index, -1)} disabled={index === 0} title="Move up">
                ↑
              </button>
              <button
                className="btn btn--icon"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                title="Move down"
              >
                ↓
              </button>
              <button className="btn btn--icon btn--danger" onClick={() => remove(index)} title="Remove">
                ×
              </button>
            </span>
          </div>
          {children(item, (patch) => update(index, patch), index)}
        </div>
      ))}
      <button className="btn" onClick={() => onChange([...items, create()])}>
        + {addLabel}
      </button>
    </div>
  );
}
