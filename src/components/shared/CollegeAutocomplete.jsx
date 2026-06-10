import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api.js';

/**
 * Free-text "College / School Name" input with autocomplete sourced from
 * /api/dashboard/college-directory. Suggestions merge registered College/Campus
 * tenants with names other students have already entered. Typing a brand-new
 * name is accepted as-is and becomes part of the directory once saved.
 */
export default function CollegeAutocomplete({ value, onChange, inputStyle, labelStyle, label = 'COLLEGE / SCHOOL NAME', placeholder = 'e.g. ABC Institute of Technology', dropdownStyle, itemStyle, itemHoverBg }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.getCollegeDirectory(value || '')
        .then(r => setSuggestions(Array.isArray(r?.data) ? r.data : []))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const filtered = suggestions.filter(name => !value || name.toLowerCase() !== value.trim().toLowerCase());

  return (
    <div style={{ position: 'relative' }}>
      {label && <label style={labelStyle || { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>{label}</label>}
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#0D1B2D', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, maxHeight: 200, overflowY: 'auto', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', ...dropdownStyle }}>
          {filtered.map(name => (
            <div
              key={name}
              onMouseDown={() => { onChange(name); setOpen(false); }}
              style={{ padding: '8px 12px', fontSize: 13, color: '#FFFFFF', cursor: 'pointer', ...itemStyle }}
              onMouseEnter={e => { e.currentTarget.style.background = itemHoverBg || 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
