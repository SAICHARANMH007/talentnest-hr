/* Salesforce Lightning Design System – base style constants
   Colors use CSS variables so all 3 themes (Light / Dark / Ocean) apply
   across the entire app without touching individual page components. */

export const card = {
  background: 'var(--app-card-bg, #FFFFFF)',
  border: '1px solid var(--app-card-border, #E5E7EB)',
  borderRadius: 16,
  padding: 'clamp(14px, 2.5vw, 24px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

export const glassCard = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

// Aliases for backward compatibility to prevent build breakage
export const glass = glassCard;

export const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const Z = {
  BASE: 1,
  SIDEBAR: 5000,
  OVERLAY: 10000,
  MODAL: 20000,
  DRAWER: 25000,
  SPOTLIGHT: 30000,
  DROPDOWN: 40000,
  TOAST: 50000,
  LOADER: 60000,
};

export const inp = {
  background: 'var(--app-input-bg, #FFFFFF)',
  border: '1.5px solid var(--app-input-border, #E5E7EB)',
  borderRadius: 10,
  color: 'var(--app-text, #181818)',
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
};

export const btnP = {
  background: 'linear-gradient(135deg, var(--app-primary, #0176D3) 0%, color-mix(in srgb, var(--app-primary, #0176D3) 80%, #000) 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
};

export const btnG = {
  background: 'var(--app-btn-ghost, #FFFFFF)',
  color: 'var(--app-btn-ghost-text, #0176D3)',
  border: '1.5px solid var(--app-btn-ghost-border, #E5E7EB)',
  borderRadius: 10,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
};

export const btnD = {
  background: 'transparent',
  color: '#BA0517',
  border: '1px solid #BA0517',
  borderRadius: 4,
  padding: '7px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
