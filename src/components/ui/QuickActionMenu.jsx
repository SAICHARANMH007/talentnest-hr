import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from './Toast.jsx';

const menuStyle = {
  position: 'fixed',
  bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
  right: 'calc(16px + env(safe-area-inset-right, 0px))',
  zIndex: 3000,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 12
};

const fabStyle = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #0176D3, #0154A4)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 24,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 8px 16px rgba(1,118,211,0.3)',
  transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  outline: 'none'
};

const actionBtnStyle = {
  padding: '10px 16px',
  borderRadius: 12,
  background: '#fff',
  color: '#0F172A',
  fontSize: 13,
  fontWeight: 700,
  border: '1px solid rgba(1,118,211,0.2)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all 0.2s',
  opacity: 0,
  transform: 'translateY(10px)',
  pointerEvents: 'none'
};

const activeActionBtnStyle = {
  ...actionBtnStyle,
  opacity: 1,
  transform: 'translateY(0)',
  pointerEvents: 'auto'
};

export default function QuickActionMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  // Only show for recruiter, admin, super_admin
  if (!user || user.role === 'candidate') return null;

  return (
    <>
      <Toast msg={toast} onClose={() => setToast('')} />

      <div style={menuStyle}>
        {isOpen && (
          <>
            <button
              onClick={() => { navigate('/app/add-candidate'); setIsOpen(false); }}
              style={{ ...activeActionBtnStyle, transitionDelay: '0.05s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              👤 Add Candidate
            </button>
            {(user.role === 'recruiter' || user.role === 'admin' || user.role === 'super_admin') && (
              <button
                onClick={() => { navigate('/app/jobs/create'); setIsOpen(false); }}
                style={activeActionBtnStyle}
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
              >
                💼 Post Job
              </button>
            )}
          </>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{ ...fabStyle, transform: isOpen ? 'rotate(135deg)' : 'none' }}
          title={isOpen ? 'Close' : 'Quick Actions'}
        >
          +
        </button>
      </div>
    </>
  );
}
