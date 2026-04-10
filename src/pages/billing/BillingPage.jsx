import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { card, btnP, btnG } from '../../constants/styles.js';

export default function BillingPage() {
  const [usage, setUsage] = useState(null);
  const [plans, setPlans] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState('');
  const [toast, setToast] = useState('');
  const [billingDetails, setBillingDetails] = useState({
    gstinNumber: '',
    billingAddress: '',
    billingState: '',
  });

  const loadData = async () => {
    try {
      const [u, p, i] = await Promise.all([
        api.getBillingUsage(),
        api.getBillingPlans(),
        api.getBillingInvoices(),
      ]);
      setUsage(u.data || u);
      setPlans(p.data || p);
      setInvoices(i.data || i || []);
    } catch (err) {
      setToast(`❌ Failed to load billing data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleUpdateBilling = async () => {
    try {
      // Assuming api.patchTenant exists or using generic org update logic from prompt
      await api.updateOrgSettings(usage.tenantId || 'self', billingDetails);
      setToast('✅ Billing details updated successfully.');
    } catch (err) {
      setToast(`❌ Failed to update billing: ${err.message}`);
    }
  };

  const handleCheckout = async (planKey) => {
    setProcessingOrder(planKey);
    try {
      const order = await api.createBillingOrder(planKey);
      const options = {
        key: order.data.key,
        amount: order.data.amount,
        currency: order.data.currency,
        name: 'TalentNest HR',
        description: `${plans[planKey].name} Plan Subscription`,
        image: '/logo.png',
        order_id: order.data.id,
        handler: async (response) => {
          try {
            await api.verifyBillingPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setToast('✅ Subscription activated successfully!');
            loadData();
          } catch (err) {
            setToast(`❌ Verification failed: ${err.message}`);
          }
        },
        prefill: {
          name: usage.orgName || '',
          email: usage.email || '',
        },
        theme: { color: '#0176D3' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setToast(`❌ Order creation failed: ${err.message}`);
    } finally {
      setProcessingOrder('');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spinner /> Loading billing overview...</div>;

  const currentPlanKey = (usage?.planName || 'trial').toLowerCase();
  const limits = usage?.limits || {};

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Billing & Subscriptions</h1>

      {/* ── Section 1: Usage Overview ────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Current Plan: {usage?.planName}</h2>
            <p style={{ color: '#706E6B', fontSize: 13, marginTop: 4 }}>
              Status: <Badge label={usage?.subscriptionStatus?.toUpperCase()} color={usage?.subscriptionStatus === 'active' ? '#2E844A' : '#BA0517'} />
              {usage?.subscriptionExpiry && ` • Renews: ${new Date(usage.subscriptionExpiry).toLocaleDateString()}`}
            </p>
          </div>
          {usage?.planName === 'Trial' && (
            <button onClick={() => window.scrollTo(0, 600)} style={btnP}>🚀 Upgrade Now</button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {Object.entries(limits).map(([resource, data]) => {
            const percentage = data.max === -1 ? 0 : Math.min(100, (data.used / data.max) * 100);
            const isFull = data.max !== -1 && data.used >= data.max;
            const barColor = percentage >= 100 ? '#BA0517' : percentage >= 80 ? '#F59E0B' : '#0176D3';

            return (
              <div key={resource}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: '#3E3E3C' }}>{resource.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                  <span style={{ color: isFull ? '#BA0517' : '#181818', fontWeight: 700 }}>
                    {data.used} / {data.max === -1 ? '∞' : data.max}
                  </span>
                </div>
                <div style={{ height: 8, background: '#FAFAF9', borderRadius: 4, overflow: 'hidden', border: '1px solid #ECEBEA' }}>
                  <div style={{ height: '100%', width: data.max === -1 ? '100%' : `${percentage}%`, background: barColor, borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
                {isFull && <p style={{ color: '#BA0517', fontSize: 10, marginTop: 4, fontWeight: 600 }}>Limit reached! Upgrade for more.</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Manage Plans ───────────────────────────────────────────── */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Choose Your Plan</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>
        {Object.entries(plans).map(([key, plan]) => {
          const isCurrent = currentPlanKey === key;
          const planColor = key === 'agency' ? '#7c3aed' : key === 'growth' ? '#014486' : '#0176D3';

          return (
            <div key={key} style={{ ...card, border: isCurrent ? `2px solid ${planColor}` : '1px solid rgba(1,118,211,0.15)', display: 'flex', flexDirection: 'column' }}>
              {isCurrent && <div style={{ position: 'absolute', top: -12, right: 16, background: planColor, color: '#fff', padding: '2px 10px', borderRadius: 10, fontSize: 10, fontWeight: 800 }}>CURRENT</div>}
              <h3 style={{ color: planColor, margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>{plan.name}</h3>
              <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
                ₹{plan.priceINR.toLocaleString()}
                <span style={{ fontSize: 14, color: '#706E6B', fontWeight: 400 }}> /year</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: 13, display: 'flex', gap: 8, color: '#181818' }}>
                    <span style={{ color: '#2E844A' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => !isCurrent && handleCheckout(key)}
                disabled={isCurrent || processingOrder === key}
                style={{
                  ...btnP,
                  marginTop: 24,
                  background: isCurrent ? '#F3F2F2' : planColor,
                  color: isCurrent ? '#9E9D9B' : '#fff',
                  cursor: isCurrent ? 'default' : 'pointer',
                  width: '100%',
                }}
              >
                {isCurrent ? 'Current Plan' : processingOrder === key ? <Spinner /> : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Section 3: Invoices ────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Purchase History</h2>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#FAFAF9', fontSize: 12, textTransform: 'uppercase', color: '#706E6B' }}>
            <tr>
              <th style={{ padding: '12px 20px' }}>Invoice No</th>
              <th style={{ padding: '12px 20px' }}>Plan</th>
              <th style={{ padding: '12px 20px' }}>Amount</th>
              <th style={{ padding: '12px 20px' }}>Date</th>
              <th style={{ padding: '12px 20px' }}>Action</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: 13 }}>
            {invoices.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: '#706E6B' }}>No purchase history found.</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #ECEBEA' }}>
                <td style={{ padding: '12px 20px', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                <td style={{ padding: '12px 20px' }}>{inv.planName.charAt(0).toUpperCase() + inv.planName.slice(1)}</td>
                <td style={{ padding: '12px 20px' }}>₹{inv.amountINR.toLocaleString()}</td>
                <td style={{ padding: '12px 20px' }}>{new Date(inv.paidAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px 20px' }}>
                  <a href={inv.invoicePdfUrl} target="_blank" rel="noreferrer" style={{ ...btnG, padding: '4px 8px', fontSize: 11, textDecoration: 'none' }}>⬇ Download</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Section 4: Billing Details ────────────────────────────────────────── */}
      <div style={{ ...card, marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>GST & Billing Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#706E6B', display: 'block', marginBottom: 4 }}>Customer GSTIN</label>
            <input
              type="text"
              placeholder="e.g. 29AAAAA0000A1Z5"
              value={billingDetails.gstinNumber}
              onChange={e => setBillingDetails({ ...billingDetails, gstinNumber: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #DDDBDA' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#706E6B', display: 'block', marginBottom: 4 }}>Billing State</label>
            <input
              type="text"
              placeholder="e.g. Maharashtra"
              value={billingDetails.billingState}
              onChange={e => setBillingDetails({ ...billingDetails, billingState: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #DDDBDA' }}
            />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#706E6B', display: 'block', marginBottom: 4 }}>Full Billing Address</label>
          <textarea
            rows="3"
            placeholder="Door No, Building, Street, City, ZIP"
            value={billingDetails.billingAddress}
            onChange={e => setBillingDetails({ ...billingDetails, billingAddress: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #DDDBDA', resize: 'vertical' }}
          />
        </div>
        <button onClick={handleUpdateBilling} style={btnG}>Save Billing Info</button>
      </div>
    </div>
  );
}
