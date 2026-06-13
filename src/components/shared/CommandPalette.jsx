import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Global Command Palette (Ctrl/Cmd+K) ─────────────────────────────────────────
export default function CommandPalette({ open, onClose, nav, onLogout }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(() => {
    const navItems = (nav || []).map(n => ({
      id: `nav-${n.id}`,
      icon: n.icon,
      label: n.label,
      hint: 'Go to page',
      action: () => navigate(`/app/${n.id}`),
    }));
    const extraItems = [
      { id: 'action-logout', icon: '🚪', label: 'Sign Out', hint: 'Action', action: () => onLogout?.() },
    ];
    return [...navItems, ...extraItems];
  }, [nav, navigate, onLogout]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => it.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const runItem = (item) => {
    if (!item) return;
    item.action();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(filtered[activeIndex]);
    }
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '12vh 16px 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, background: 'var(--app-surface, #fff)',
          borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and actions..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15,
              background: 'transparent', color: 'var(--app-text, #0f172a)',
            }}
          />
          <kbd style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: 'rgba(100,116,139,0.12)', borderRadius: 6, padding: '3px 6px' }}>Esc</kbd>
        </div>
        <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: 6 }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No matches found</div>
          )}
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => runItem(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 8, cursor: 'pointer',
                background: idx === activeIndex ? 'rgba(1,118,211,0.1)' : 'transparent',
              }}
            >
              <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--app-text, #0f172a)' }}>{item.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{item.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
