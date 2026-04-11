import React from 'react';

const BASE_INPUT = {
  width: '100%',
  minHeight: 46,
  padding: '11px 14px',
  background: '#fff',
  border: '1.5px solid #D6D9DE',
  borderRadius: 10,
  color: '#181818',
  fontSize: 14,
  lineHeight: 1.45,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s, background-color 0.15s',
};

const ERROR_STYLE = {
  borderColor: '#dc2626',
  boxShadow: '0 0 0 3px rgba(220,38,38,0.1)',
};

const FOCUS_STYLE = {
  borderColor: '#0176D3',
  boxShadow: '0 0 0 3px rgba(1,118,211,0.12)',
};

/**
 * Field — universal form field component
 * Supports: text, email, password, number, date, textarea, select
 * Props:
 *   label, value, onChange, type, placeholder, rows (textarea),
 *   options ([{value, label}] for select), error, hint,
 *   required, disabled, readOnly, autoFocus, style, inputStyle,
 *   prefix (text/icon before input), suffix (text/icon after input)
 */
export default function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  rows,
  options,        // [{value, label}] → renders <select>
  error,
  hint,
  required,
  disabled,
  readOnly,
  autoFocus,
  style = {},     // wrapper div style
  inputStyle = {}, // override input style
  prefix,         // element shown left of input (icon/text)
  suffix,         // element shown right of input (icon/text)
  name,
  min, max, step,
  maxLength,
  id,
}) {
  const [focused, setFocused] = React.useState(false);
  const fieldId = id || name || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

  const computedInputStyle = {
    ...BASE_INPUT,
    ...(focused && !error ? FOCUS_STYLE : {}),
    ...(error ? ERROR_STYLE : {}),
    ...(disabled ? { background: '#f8fafc', color: '#9ca3af', cursor: 'not-allowed' } : {}),
    ...(prefix ? { paddingLeft: 36 } : {}),
    ...(suffix ? { paddingRight: 36 } : {}),
    ...inputStyle,
  };

  const renderInput = () => {
    const sharedProps = {
      id: fieldId,
      name,
      value: value ?? '',
      onChange: e => onChange && onChange(e.target.value, e),
      onFocus: () => setFocused(true),
      onBlur:  () => setFocused(false),
      disabled,
      readOnly,
      autoFocus,
      placeholder,
      maxLength,
      style: computedInputStyle,
    };

    if (options) {
      return (
        <select {...sharedProps} className="tn-field-control">
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>
              {o.label ?? o}
            </option>
          ))}
        </select>
      );
    }

    if (rows) {
      return (
        <textarea
          {...sharedProps}
          className="tn-field-control"
          rows={rows}
          style={{ ...computedInputStyle, minHeight: Math.max((rows || 3) * 24 + 24, 112), resize: 'vertical', lineHeight: 1.6, paddingTop: 12, paddingBottom: 12 }}
        />
      );
    }

    return (
      <input
        {...sharedProps}
        className="tn-field-control"
        type={type}
        min={min}
        max={max}
        step={step}
      />
    );
  };

  return (
    <div className="tn-field" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', minWidth: 0, ...style }}>
      {label && (
        <label
          htmlFor={fieldId}
          style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1.3 }}
        >
          {label}
          {required && <span style={{ color: '#dc2626', fontSize: 11 }}>*</span>}
        </label>
      )}

      {(prefix || suffix) ? (
        <div style={{ position: 'relative' }}>
          {prefix && (
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14, pointerEvents: 'none', zIndex: 1 }}>
              {prefix}
            </span>
          )}
          {renderInput()}
          {suffix && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14, zIndex: 1 }}>
              {suffix}
            </span>
          )}
        </div>
      ) : renderInput()}

      {error && (
        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 500 }}>⚠ {error}</span>
      )}
      {hint && !error && (
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</span>
      )}
    </div>
  );
}
