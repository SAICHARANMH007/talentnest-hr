// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg,#f8f8f8,#f0f0f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: '#fff', borderRadius: 24, maxWidth: 480, width: '100%', padding: '48px 40px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' },
  icon: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 800, color: '#374151', margin: '0 0 12px' },
  sub: { fontSize: 15, color: '#6b7280', lineHeight: 1.8, margin: '0 0 32px' },
  btn: { display: 'inline-block', padding: '12px 32px', background: '#706E6B', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', cursor: 'pointer', border: 'none' },
};

export default function InterestDeclinedPage() {
  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.icon}>🙏</div>
        <h1 style={S.title}>Thank You for Letting Us Know</h1>
        <p style={S.sub}>
          We appreciate you taking the time to respond. We understand this opportunity might not be the right fit right now.
          <br /><br />
          We'll keep your profile on file and reach out when a more suitable opportunity arises.
        </p>
        <button onClick={() => window.close()} style={S.btn}>Close Window</button>
      </div>
    </div>
  );
}
