import Field from './Field.jsx';

/**
 * Dropdown — backward-compatible wrapper around Field with options.
 * Existing code using <Dropdown> continues to work unchanged.
 */
export default function Dropdown({ label, value, onChange, options, placeholder, disabled, error, hint, required, style }) {
  return (
    <Field
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      hint={hint}
      required={required}
      style={style}
    />
  );
}
