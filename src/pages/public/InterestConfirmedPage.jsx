// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: '#fff', borderRadius: 24, maxWidth: 480, width: '100%', padding: '48px 40px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' },
  icon: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 800, color: '#065f46', margin: '0 0 12px' },
  sub: { fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: '0 0 32px' },
  btn: { display: 'inline-block', padding: '12px 32px', background: '#0176D3', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', cursor: 'pointer', border: 'none' },
};

export default function InterestConfirmedPage() {
  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.icon}>🎉</div>
        <h1 style={S.title}>You're Interested!</h1>
        <p style={S.sub}>
          Thank you for confirming your interest. Your recruiter has been notified and will reach out to schedule the next steps.
          <br /><br />
          Keep an eye on your inbox for further updates.
        </p>
        <button onClick={() => window.close()} style={S.btn}>Close Window</button>
      </div>
    </div>
  );
}
