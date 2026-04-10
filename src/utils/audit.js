// Audit log utility — writes to localStorage, max 100 entries kept
export function logAudit(action, resource, detail, level = 'info', userOverride = null) {
  try {
    const u = userOverride || JSON.parse(sessionStorage.getItem('tn_user') || '{}');
    const log = JSON.parse(localStorage.getItem('tn_audit_log') || '[]');
    log.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toISOString(),
      user: u.name || 'Unknown',
      role: u.role || 'unknown',
      action,
      resource,
      detail,
      level,
    });
    localStorage.setItem('tn_audit_log', JSON.stringify(log.slice(0, 100)));
  } catch { /* silent */ }
}

export function getAuditLog(limit = 20) {
  try {
    return JSON.parse(localStorage.getItem('tn_audit_log') || '[]').slice(0, limit);
  } catch { return []; }
}
