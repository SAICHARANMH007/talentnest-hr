import React, { useState, useEffect, useRef } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import HiredDetailsModal from '../../components/modals/HiredDetailsModal.jsx';
import OfferLetterModal from '../../components/modals/OfferLetterModal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import StageTracker from '../../components/pipeline/StageTracker.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import { useNavigate } from 'react-router-dom';
import { STAGES, SM, NEXT } from '../../constants/stages.js';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const DEFAULT_PRESET_TAGS = ['Top Talent', 'On Hold', 'Budget Fit', 'Overqualified', 'Culture Fit'];
const DEFAULT_TAG_COLORS = {
  'Top Talent': '#10b981',
  'On Hold': '#F59E0B',
  'Budget Fit': '#014486',
  'Overqualified': '#BA0517',
  'Culture Fit': '#0176D3',
};

// Debounce helper
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return (...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  };
}

// ── Feedback Modal ─────────────────────────────────────────────────────────────
function FeedbackModal({ app, onClose, onDone }) {
  const [form, setForm] = useState({ rating: 3, strengths: '', weaknesses: '', recommendation: true });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.strengths?.trim() && !form.weaknesses?.trim()) {
      onDone('❌ Please add at least one strength or area for improvement');
      return;
    }
    setSaving(true);
    try {
      await api.addFeedback(app.id, form);
      onDone('✅ Feedback saved!');
      onClose();
    } catch (e) {
      onDone(`❌ ${e.message}`);
      onClose();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        {/* Sticky header */}
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Interview Review</div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 800 }}>📝 Feedback — {app.candidate?.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Rating</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    onClick={() => setForm(p => ({ ...p, rating: r }))}
                    aria-label={`Rate ${r} out of 5`}
                    aria-pressed={form.rating >= r}
                    style={{ width: 36, height: 36, borderRadius: 8, border: form.rating >= r ? '2px solid #0176D3' : '1px solid #EAF5FE', background: form.rating >= r ? 'rgba(1,118,211,0.2)' : '#FFFFFF', color: form.rating >= r ? '#0176D3' : '#9E9D9B', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    {r}
                  </button>
                ))}
                <span style={{ color: '#706E6B', fontSize: 12, alignSelf: 'center', marginLeft: 4 }}>
                  {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][form.rating]}
                </span>
              </div>
            </div>

            <div>
              <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Strengths</label>
              <textarea
                value={form.strengths}
                onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))}
                rows={2}
                placeholder="What did the candidate do well?"
                style={{ width: '100%', padding: '8px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Areas for Improvement</label>
              <textarea
                value={form.weaknesses}
                onChange={e => setForm(p => ({ ...p, weaknesses: e.target.value }))}
                rows={2}
                placeholder="What could be improved?"
                style={{ width: '100%', padding: '8px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Recommendation</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setForm(p => ({ ...p, recommendation: true }))}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: form.recommendation ? '2px solid #10b981' : '1px solid #DDDBDA', background: form.recommendation ? 'rgba(16,185,129,0.15)' : '#FFFFFF', color: form.recommendation ? '#34d399' : '#9E9D9B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  ✓ Move Forward
                </button>
                <button
                  onClick={() => setForm(p => ({ ...p, recommendation: false }))}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: !form.recommendation ? '2px solid #BA0517' : '1px solid #DDDBDA', background: !form.recommendation ? 'rgba(186,5,23,0.15)' : '#FFFFFF', color: !form.recommendation ? '#FE5C4C' : '#9E9D9B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  ✕ Do Not Proceed
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #F1F5F9', background: '#fff', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ background: '#F8FAFF', border: '1.5px solid #E2E8F0', borderRadius: 10, color: '#374151', fontWeight: 600, padding: '11px 20px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ flex: 1, background: 'linear-gradient(135deg,#0176D3,#0154A4)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '11px 0', cursor: 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1, boxShadow: '0 4px 12px rgba(1,118,211,0.3)' }}>
            {saving ? '⏳ Saving…' : '💾 Save Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SLA helpers ───────────────────────────────────────────────────────────────
const STAGE_SLA_HOURS = {
  Applied            : 24,
  Screening          : 48,
  Shortlisted        : 72,
  'Interview Round 1': 168,
  'Interview Round 2': 168,
  Offer              : 72,
};

function getSlaStatus(app) {
  const limit = STAGE_SLA_HOURS[app.stage || app.currentStage];
  if (!limit) return null;
  const history = app.stageHistory || [];
  if (!history.length) return null;
  const lastMove = history[history.length - 1];
  const hoursIn  = (Date.now() - new Date(lastMove.movedAt).getTime()) / (1000 * 60 * 60);
  const pct      = hoursIn / limit;
  if (pct >= 1) return { color: '#BA0517', label: `SLA breached (${Math.round(hoursIn - limit)}h overdue)` };
  if (pct >= 0.6) return { color: '#F59E0B', label: `SLA warning — ${Math.round(limit - hoursIn)}h remaining` };
  return { color: '#10B981', label: `${Math.round(limit - hoursIn)}h remaining in SLA` };
}

function SlaDot({ app }) {
  const sla = getSlaStatus(app);
  const [showTip, setShowTip] = useState(false);
  if (!sla) return null;
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        style={{ width: 10, height: 10, borderRadius: '50%', background: sla.color, cursor: 'default', flexShrink: 0, boxShadow: `0 0 0 2px ${sla.color}33` }}
      />
      {showTip && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: '#181818', color: '#fff', fontSize: 11, padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none' }}>
          {sla.label}
        </div>
      )}
    </div>
  );
}

// ── Candidate Card ─────────────────────────────────────────────────────────────
const ASMT_RESULT = {
  pass:    { color: '#34d399', bg: 'rgba(16,185,129,0.12)', label: '✅ Passed' },
  fail:    { color: '#FE5C4C', bg: 'rgba(186,5,23,0.1)',   label: '❌ Failed' },
  pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  label: '⏳ Pending Review' },
};

function CandidateCard({ app, isSelected, onSelect, onMoveStage, onAnyStage, onViewDetail, onInterview, onReject, onOffer, onToast, onRefresh, assessmentId, submission, onReviewAssessment, onPark, presetTags = DEFAULT_PRESET_TAGS, tagColors = DEFAULT_TAG_COLORS }) {
  const navigate = useNavigate();
  const c = app.candidate;
  const s = SM[app.stage] || { color: '#0176D3', label: app.stage, icon: '•' };
  const nextActions = NEXT[app.stage] || [];
  const [isEditingFunnel, setEditingFunnel] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Notes
  const [notes, setNotes] = useState(app.recruiterNotes || '');
  const [showNotes, setShowNotes] = useState(false);
  const saveNotesDebounced = useDebounce(async (val) => {
    try { await api.updateAppNotes(app.id, val); } catch {}
  }, 800);

  const handleNoteChange = (val) => {
    setNotes(val);
    saveNotesDebounced(val);
  };

  // Tags
  const [tags, setTags] = useState(Array.isArray(app.tags) ? app.tags : []);
  const [showTags, setShowTags] = useState(false);

  const toggleTag = async (tag) => {
    const newTags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(newTags);
    try { await api.updateAppTags(app.id, newTags); } catch {}
  };

  const handleAnyStage = async (newStage) => {
    setEditingFunnel(false);
    await onAnyStage(app, newStage);
  };

  return (
    <div style={{ ...card, border: `1px solid ${s.color}22`, transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', padding: '20px' }}
         onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)'; }}
         onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = card.boxShadow; }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(app.id)}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#0176D3', flexShrink: 0, borderRadius: 6 }}
          />
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#0176D3,#014486)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0, boxShadow: '0 4px 12px rgba(1,118,211,0.2)' }}>
            {(c?.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ color: '#0F172A', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>{c?.name}</div>
            <div style={{ color: '#0176D3', fontSize: 13, fontWeight: 700 }}>{c?.title} · {c?.experience || 0}y exp</div>
            <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{c?.email} · {c?.phone || 'No phone'}</div>
          </div>
        </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Match Score (UTO Engine) */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }} title={`UTO Score Breakdown: Skills: ${app.matchBreakdown?.skillScore || 0}%, Exp: ${app.matchBreakdown?.experienceScore || 0}%`}>
              <div style={{ 
                width:44, height:44, borderRadius:'50%', 
                border:`3.5px solid ${app.talentMatchScore >= 80 ? '#10b981' : app.talentMatchScore >= 50 ? '#F59E0B' : '#BA0517'}`, 
                display:'flex', alignItems:'center', justifyContent:'center', 
                fontSize:12, fontWeight:900, color:'#0F172A', background:'#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                {app.talentMatchScore || 0}%
              </div>
              <div style={{ fontSize:7, fontWeight:900, color:'#64748B', textTransform:'uppercase', letterSpacing:1 }}>UTO Match</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge label={s.icon + ' ' + s.label} color={s.color} />
                <SlaDot app={app} />
              </div>
              <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>Applied {new Date(app.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
              {app.emailSent && <span style={{ color: '#10b981', fontSize: 10, fontWeight: 800, background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20, marginTop:4 }}>📧 Invite sent</span>}
              {c?.videoResumeUrl && (
                <button onClick={() => window.open(c.videoResumeUrl, '_blank')} style={{ background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#0176D3', fontWeight: 700, marginTop:4 }} title="View video resume">🎥 Video Resume</button>
              )}
            </div>
          </div>
      </div>

      {/* Tags display */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {tags.map(tag => (
            <span key={tag} style={{ background: `${TAG_COLORS[tag] || '#0176D3'}22`, border: `1px solid ${TAG_COLORS[tag] || '#0176D3'}44`, color: TAG_COLORS[tag] || '#0176D3', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Screening Answers */}
      {app.screeningAnswers?.length > 0 && (
        <div style={{ marginBottom: 14, padding: '12px 16px', background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(124,58,237,0.02))', borderRadius: 14, border: '1.5px solid rgba(124,58,237,0.12)' }}>
          <div style={{ color: '#7C3AED', fontSize: 11, fontWeight: 900, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' }}>📋 Screening Answers</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {app.screeningAnswers.map((qa, i) => (
              <div key={i} style={{ borderBottom: i < app.screeningAnswers.length - 1 ? '1px solid rgba(124,58,237,0.08)' : 'none', paddingBottom: i < app.screeningAnswers.length - 1 ? 8 : 0 }}>
                <div style={{ color: '#1E293B', fontSize: 12, fontWeight: 700 }}>{qa.question}</div>
                <div style={{ color: '#475569', fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{qa.answer || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback display */}
      {app.feedback && (
        <div style={{ marginBottom: 14, padding: '12px 16px', background: 'rgba(1,118,211,0.06)', borderRadius: 14, border: '1.5px solid rgba(1,118,211,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#0176D3', fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase' }}>🎯 Interview Feedback</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
               <span style={{ color: '#F59E0B', fontSize: 14 }}>{'★'.repeat(app.feedback.rating || 0)}</span>
               <span style={{ color: app.feedback.recommendation ? '#10b981' : '#ef4444', fontSize: 11, fontWeight: 800, background: app.feedback.recommendation ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', padding: '2px 10px', borderRadius: 20 }}>
                 {app.feedback.recommendation ? '✓ Proceed' : '✕ Reject'}
               </span>
            </div>
          </div>
          {app.feedback.strengths && <div style={{ color: '#334155', fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' }}>"{app.feedback.strengths}"</div>}
        </div>
      )}

      {c?.skills && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          {(Array.isArray(c.skills) ? c.skills : []).map(sk => <Badge key={sk} label={sk.trim()} color="#0154A4" />)}
        </div>
      )}

      <div style={{ marginBottom: 12 }}><StageTracker stage={app.stage} /></div>

      {Array.isArray(app.interviewRounds) && app.interviewRounds.length > 0 && (app.stage === 'interview_scheduled' || app.stage === 'interview_completed') && (() => {
        const round = app.interviewRounds[app.interviewRounds.length - 1];
        if (!round?.scheduledAt) return null;
        const dt = new Date(round.scheduledAt);
        const dateStr = dt.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
        const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const fmtMode = round.format === 'video' ? 'Video Call' : round.format === 'phone' ? 'Phone' : 'In-Person';
        const link = round.videoLink ? (/^https?:\/\//i.test(round.videoLink) ? round.videoLink : 'https://' + round.videoLink) : null;
        return (
          <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
            <p style={{ color: '#F59E0B', fontSize: 12, fontWeight: 600, margin: '0 0 3px' }}>📅 Round {app.interviewRounds.length} — {fmtMode}</p>
            <p style={{ color: '#181818', fontSize: 12, margin: 0 }}>{dateStr} at {timeStr}{round.interviewerName ? ` · ${round.interviewerName}` : ''}</p>
            {link && <p style={{ fontSize: 11, margin: '3px 0 0' }}><a href={link} target="_blank" rel="noreferrer" style={{ color: '#0176D3' }}>Join Interview →</a></p>}
          </div>
        );
      })()}

      {app.stage === 'rejected' && app.rejectionReason && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(186,5,23,0.08)', borderRadius: 10 }}>
          <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>Rejection reason: {app.rejectionReason}</p>
        </div>
      )}

      {/* Notes Panel */}
      {showNotes && (
        <div style={{ marginBottom: 12, padding: '12px 14px', background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ color: '#0176D3', fontSize: 11, fontWeight: 600 }}>📝 Recruiter Notes</label>
            <button onClick={() => setShowNotes(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>✕</button>
          </div>
          <textarea
            value={notes}
            onChange={e => handleNoteChange(e.target.value)}
            rows={3}
            placeholder="Add private notes about this candidate..."
            style={{ width: '100%', padding: '8px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 8, color: '#181818', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <div style={{ color: '#C9C7C5', fontSize: 10, marginTop: 4 }}>Auto-saved</div>
        </div>
      )}

      {/* Tags Panel */}
      {showTags && (
        <div style={{ marginBottom: 12, padding: '12px 14px', background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ color: '#0176D3', fontSize: 11, fontWeight: 600 }}>🏷️ Tags</label>
            <button onClick={() => setShowTags(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESET_TAGS.map(tag => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{ background: active ? `${TAG_COLORS[tag]}22` : '#FFFFFF', border: `1px solid ${active ? TAG_COLORS[tag] : '#DDDBDA'}`, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: active ? 700 : 400, color: active ? (TAG_COLORS[tag] || '#0176D3') : '#706E6B', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {active ? '✓ ' : ''}{tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Funnel Panel */}
      {isEditingFunnel && (
        <div style={{ marginBottom: 12, padding: '12px 14px', background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 12 }}>
          <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, margin: '0 0 10px', letterSpacing: 1 }}>⏭ SKIP TO ANY STAGE — select a stage to jump directly</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STAGES.map(st => {
              const isCur = app.stage === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => handleAnyStage(st.id)}
                  style={{ background: isCur ? `${st.color}33` : '#FFFFFF', color: isCur ? st.color : '#706E6B', border: `1px solid ${isCur ? st.color : '#DDDBDA'}`, borderRadius: 20, padding: '5px 13px', fontSize: 11, cursor: isCur ? 'default' : 'pointer', fontWeight: isCur ? 700 : 400, transition: 'all .15s' }}
                >
                  {st.icon} {st.label}{isCur ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #F3F2F2', paddingTop: 12 }}>
        <button onClick={() => onViewDetail(app)} style={{ ...btnG, padding: '7px 14px', fontSize: 12 }}>👤 View Profile</button>
        <button onClick={() => setEditingFunnel(!isEditingFunnel)} style={{ ...btnG, padding: '7px 14px', fontSize: 12, borderColor: isEditingFunnel ? '#0176D3' : '', color: isEditingFunnel ? '#0176D3' : '' }}>⏭ {isEditingFunnel ? 'Close' : 'Skip Stage'}</button>
        <button onClick={() => setShowNotes(!showNotes)} style={{ ...btnG, padding: '7px 14px', fontSize: 12, borderColor: showNotes ? '#0176D3' : '', color: showNotes ? '#0176D3' : '' }}>📝 {notes ? 'Notes ●' : 'Notes'}</button>
        <button onClick={() => setShowTags(!showTags)} style={{ ...btnG, padding: '7px 14px', fontSize: 12, borderColor: showTags ? '#0176D3' : '', color: showTags ? '#0176D3' : '' }}>🏷️ Tags{tags.length > 0 ? ` (${tags.length})` : ''}</button>
        {app.stage === 'interview_completed' && (
          <button onClick={() => setShowFeedback(true)} style={{ background: 'rgba(1,118,211,0.15)', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 12, color: '#0176D3', padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>📋 {app.feedback ? 'Edit Feedback' : 'Add Feedback'}</button>
        )}
        {/* Assessment badge + review */}
        {assessmentId && (
          submission ? (
            <button
              onClick={() => onReviewAssessment(assessmentId, submission.id)}
              style={{ background: ASMT_RESULT[submission.result]?.bg || '#FFFFFF', border: `1px solid ${ASMT_RESULT[submission.result]?.color || '#EAF5FE'}44`, borderRadius: 12, color: ASMT_RESULT[submission.result]?.color || '#706E6B', padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              📊 Assessment: {ASMT_RESULT[submission.result]?.label || submission.result} ({submission.percentage ?? '?'}%)
            </button>
          ) : (
            <span style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, color: '#F59E0B', padding: '7px 14px', fontSize: 11 }}>
              📝 Assessment pending
            </span>
          )
        )}
        {/* Prominent Offer Letter button */}
        {(app.stage === 'interview_completed' || app.stage === 'offer_extended') && (
          <button
            onClick={() => onOffer(app)}
            style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(234,179,8,0.15))', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 12, color: '#F59E0B', padding: '7px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
          >
            📄 {app.stage === 'offer_extended' ? 'Edit / Resend Offer Letter' : 'Send Offer Letter'}
          </button>
        )}
        {!isEditingFunnel && nextActions.filter(a => a !== 'rejected' && a !== 'offer_extended').map(a => {
          const ns = SM[a];
          return (
            <button key={a} onClick={() => onMoveStage(app, a)} style={{ background: `${ns.color}22`, color: ns.color, border: `1px solid ${ns.color}44`, borderRadius: 12, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
              {a === 'interview_scheduled' ? '📅 Schedule Interview' : `${ns.icon} → ${ns.label}`}
            </button>
          );
        })}
        {app.stage === 'interview_scheduled' && (
          <button onClick={() => onInterview(app)} style={{ ...btnG, padding: '7px 14px', fontSize: 12 }}>✏️ Edit Interview</button>
        )}
        {app.stage !== 'rejected' && app.stage !== 'selected' && (
          <button onClick={() => navigate(`/app/forms/reject?appId=${app.id}`)} style={{ ...btnD, padding: '7px 14px', fontSize: 12 }}>✕ Reject</button>
        )}
        <button 
          onClick={() => onPark?.(app)} 
          style={{ 
            background: '#fff', 
            border: '1.5px solid #F59E0B', 
            color: '#F59E0B', 
            borderRadius: 10, 
            padding: '7px 14px', 
            fontSize: 12, 
            fontWeight: 800, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F59E0B'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#F59E0B'; }}
        >
          🅿️ Park
        </button>
      </div>

      {showFeedback && (
        <FeedbackModal
          app={app}
          onClose={() => setShowFeedback(false)}
          onDone={(msg) => { onToast(msg); setShowFeedback(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function RecruiterPipeline({ user }) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selJob, setSelJob] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [presetTags, setPresetTags] = useState(DEFAULT_PRESET_TAGS);
  const [tagColors, setTagColors] = useState(DEFAULT_TAG_COLORS);
  const [apps, setApps] = useState([]);
  const [loading, setLoad] = useState(false);
  const [detailApp, setDetApp] = useState(null);
  const [toast, setToast] = useState('');
  const [hiredModal, setHiredModal] = useState(null);
  const [offerModalApp, setOfferModalApp] = useState(null);
  const [recruiter, setRecruiter] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [assessmentData, setAssessmentData] = useState(null); // { id, submissionsMap: { [candidateId]: submission } }
  const [stageFilter, setSF] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active'); // active, parked, all
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [movingAppId, setMovingAppId] = useState(null);

  useEffect(() => {
    api.getJobs({ minimal: true }).then(j => {
      const raw = Array.isArray(j) ? j : (j?.data || []);
      const map = new Map();
      raw.forEach(item => {
        const id = (item._id ? item._id.toString() : item.id) || undefined;
        if (id) map.set(id, { ...item, id });
      });
      setJobs(Array.from(map.values()));
    }).catch(() => setJobs([]));
    api.getUser(user.id).then(r => setRecruiter(r?.data || r)).catch(() => {});
    // Load org custom tags
    api.getCustomizations().then(r => {
      const orgTags = (r?.data?.tags || []).map(t => t.name || t).filter(Boolean);
      if (orgTags.length > 0) {
        const combined = Array.from(new Set([...DEFAULT_PRESET_TAGS, ...orgTags]));
        const colorMap = { ...DEFAULT_TAG_COLORS };
        (r?.data?.tags || []).forEach(t => { if (t.name && t.color) colorMap[t.name] = t.color; });
        setPresetTags(combined);
        setTagColors(colorMap);
      }
    }).catch(() => {});
  }, [user.id]);

  const loadApps = async (jid, pg = 1) => {
    setAssessmentData(null);
    if (!jid) { setApps([]); return; }
    setLoad(true);
    
    const params = { 
      jobId: jid, 
      page: pg, 
      limit: pagination.limit,
      stage: stageFilter === 'all' ? undefined : stageFilter,
      // Status filter mapping:
      status: statusFilter === 'parked' ? 'parked' : (statusFilter === 'all' ? undefined : statusFilter)
    };

    api.getApplications(params).then(res => {
      const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const map = new Map();
      raw.forEach(item => {
        const id = String(item.id || item._id);
        if (id) map.set(id, { ...item, id });
      });
      setApps(Array.from(map.values()));
      if (res?.pagination) setPagination(res.pagination);
    }).catch(() => setApps([])).finally(() => setLoad(false));
    // Load assessment for this job
    api.getAssessmentForJob(jid).then(async (a) => {
      if (!a?.id) return;
      const subs = await api.getAssessmentSubmissions(a.id).catch(() => []);
      const map = {};
      (Array.isArray(subs) ? subs : []).forEach(s => { if (s?.candidateId) map[String(s.candidateId)] = s; });
      setAssessmentData({ id: a.id, submissionsMap: map });
    }).catch(() => setAssessmentData(null));
  };

  const refresh = () => loadApps(selJob, pagination.page);

  useEffect(() => {
    if (selJob) loadApps(selJob, pagination.page);
  }, [selJob, pagination.page, stageFilter, statusFilter]);

  const triggerHiredModal = (app, appId, newStage) => {
    if (newStage === 'selected') {
      setHiredModal({ appId: String(appId || app?.id), candidateName: app?.candidateName || app?.candidate?.name || 'Candidate', jobTitle: app?.job?.title || app?.jobTitle || '' });
    }
  };

  const moveStage = async (app, newStage) => {
    if (newStage === 'rejected') { navigate(`/app/forms/reject?appId=${app.id}`); return; }
    if (newStage === 'interview_scheduled') { navigate(`/app/forms/interview?appId=${app.id}`); return; }
    if (newStage === 'offer_extended') { setOfferModalApp(app); return; }
    if (movingAppId) return; // prevent double-click
    setMovingAppId(app.id);
    try {
      await api.updateStage(app.id, newStage);
      setToast(`✅ Stage updated → ${SM[newStage]?.label || newStage}`);
      triggerHiredModal(app, app.id, newStage);
      refresh();
    } catch (e) {
      setToast(`❌ Failed to update stage: ${e.message}`);
    } finally {
      setMovingAppId(null);
    }
  };

  const setAnyStage = async (app, newStage) => {
    if (newStage === app.stage) return;
    if (newStage === 'rejected') { navigate(`/app/forms/reject?appId=${app.id}`); return; }
    if (newStage === 'interview_scheduled') { navigate(`/app/forms/interview?appId=${app.id}`); return; }
    if (newStage === 'offer_extended') { setOfferModalApp(app); return; }
    if (movingAppId) return; // prevent double-click
    setMovingAppId(app.id);
    try {
      await api.updateStage(app.id, newStage);
      setToast(`✅ Funnel updated → ${SM[newStage]?.label || newStage}`);
      triggerHiredModal(app, app.id, newStage);
      refresh();
    } catch (e) {
      setToast(`❌ Failed to update stage: ${e.message}`);
    } finally {
      setMovingAppId(null);
    }
  };

  // Bulk actions
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const bulkMoveStage = async (newStage) => {
    const label = SM[newStage]?.label || newStage;
    try {
      await Promise.all(selectedIds.map(id => api.updateStage(id, newStage)));
      setToast(`✅ ${selectedIds.length} candidates moved to ${label}`);
      setSelectedIds([]);
      refresh();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
  };

  const handlePark = async (app) => {
    try {
      await api.parkApplication(app.id);
      setToast('🅿️ Candidate moved to Talent Pool');
      refresh();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
  };

  const stageCounts = STAGES.reduce((acc, s) => { acc[s.id] = apps.filter(a => a.stage === s.id).length; return acc; }, {});
  let filtered = apps;
  
  // Sort applicants by assessment score (descending) so top candidates are prioritized
  if (assessmentData?.submissionsMap) {
    filtered.sort((a, b) => {
      const subA = assessmentData.submissionsMap[String(a.candidate?.id || a.candidate?._id || a.candidateId || '')];
      const subB = assessmentData.submissionsMap[String(b.candidate?.id || b.candidate?._id || b.candidateId || '')];
      const scoreA = subA?.percentage ?? -1;
      const scoreB = subB?.percentage ?? -1;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.createdAt) - new Date(a.createdAt); // fallback to newest
    });
  } else {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const selectedJob = jobs.find(j => String(j.id) === String(selJob));

  // Jobs filtered by the search input in the pill bar
  const filteredJobs = jobSearch.trim()
    ? jobs.filter(j =>
        (j.title || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
        (j.company || j.companyName || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
        (j.location || '').toLowerCase().includes(jobSearch.toLowerCase())
      )
    : jobs;

  // Unified handler for selecting a job (pill, card, or any other entry point)
  const selectJob = (id) => {
    setSelJob(id);
    setSelectedIds([]);
    setSF('all');
    setPagination(p => ({ ...p, page: 1 }));
    setJobSearch('');
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      {detailApp && <UserDetailDrawer user={detailApp.candidate} app={detailApp} onClose={() => setDetApp(null)} onUpdated={refresh} />}
      {hiredModal && (
        <HiredDetailsModal
          appId={hiredModal.appId}
          candidateName={hiredModal.candidateName}
          jobTitle={hiredModal.jobTitle}
          onClose={() => setHiredModal(null)}
          onSaved={() => { setHiredModal(null); refresh(); }}
        />
      )}
      {offerModalApp && (
        <OfferLetterModal
          app={offerModalApp}
          recruiter={recruiter || user}
          onClose={() => setOfferModalApp(null)}
          onDone={(msg) => { setToast(msg); setOfferModalApp(null); refresh(); }}
        />
      )}

      <PageHeader title="Applicant Pipeline" subtitle="Full hiring funnel management" />

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 20px', background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: '#0176D3', fontWeight: 700, fontSize: 13 }}>{selectedIds.length} selected</span>
          <span style={{ color: '#C9C7C5', fontSize: 13 }}>—</span>
          <button onClick={() => bulkMoveStage('shortlisted')} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#34d399', fontSize: 12, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>✓ Shortlist</button>
          <button onClick={() => bulkMoveStage('interview_scheduled')} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: '#F59E0B', fontSize: 12, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>📅 Move to Interview</button>
          <button onClick={() => bulkMoveStage('rejected')} style={{ background: 'rgba(186,5,23,0.1)', border: '1px solid rgba(186,5,23,0.3)', borderRadius: 8, color: '#FE5C4C', fontSize: 12, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>✕ Reject</button>
          <button onClick={() => setSelectedIds([])} style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 8, color: '#706E6B', fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {/* ── Job Selector ─────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 20, padding: '14px 16px' }}>
        {/* Search + action bar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94A3B8', pointerEvents: 'none' }}>🔍</span>
            <input
              value={jobSearch}
              onChange={e => setJobSearch(e.target.value)}
              placeholder={`Search ${jobs.length} job${jobs.length !== 1 ? 's' : ''}…`}
              style={{ ...inp, paddingLeft: 32, fontSize: 13 }}
            />
          </div>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: 3, borderRadius: 10, flexShrink: 0 }}>
            {['active', 'parked', 'all'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', background: statusFilter === s ? '#fff' : 'transparent', color: statusFilter === s ? '#0176D3' : '#64748B', boxShadow: statusFilter === s ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                {s}
              </button>
            ))}
          </div>
          {selJob && (
            <button onClick={() => navigate(`/app/talent-match?job=${selJob}`)} style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
              🎯 Find Matches
            </button>
          )}
          {selJob && (
            <button onClick={() => selectJob('')} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10, padding: '9px 14px', fontSize: 12, color: '#64748B', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
              ← All Jobs
            </button>
          )}
        </div>

        {/* Scrollable job pill bar */}
        {filteredJobs.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {filteredJobs.map(j => {
              const isActive = String(j.id) === String(selJob);
              const isUrgent = (j.urgency || '').toLowerCase() === 'urgent' || (j.urgency || '').toLowerCase() === 'high';
              const isDraft  = j.status === 'draft';
              return (
                <button
                  key={j.id}
                  onClick={() => selectJob(j.id)}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 13px', borderRadius: 22,
                    border: `1.5px solid ${isActive ? '#0176D3' : isUrgent ? 'rgba(220,38,38,0.35)' : '#E2E8F0'}`,
                    background: isActive ? 'rgba(1,118,211,0.1)' : isDraft ? '#FAFAFA' : '#fff',
                    color: isActive ? '#0176D3' : isDraft ? '#94A3B8' : '#374151',
                    fontWeight: isActive ? 700 : 500, fontSize: 12, cursor: 'pointer',
                    boxShadow: isActive ? '0 0 0 3px rgba(1,118,211,0.12)' : 'none',
                    transition: 'all 0.12s',
                    maxWidth: 240,
                  }}
                  title={`${j.title} · ${j.applicantsCount || 0} applicants · ${j.status}`}
                >
                  {isUrgent && !isActive && <span style={{ fontSize: 10 }}>🔴</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {j.title}
                  </span>
                  <span style={{ flexShrink: 0, background: isActive ? '#0176D3' : '#E2E8F0', color: isActive ? '#fff' : '#64748B', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                    {j.applicantsCount || 0}
                  </span>
                  {isDraft && <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 700 }}>DRAFT</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>No jobs match "{jobSearch}".</p>
        )}

        {/* Selected job info strip */}
        {selectedJob && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{selectedJob.title}</span>
            <Badge label={selectedJob.status || 'Active'} color="#2E844A" />
            {(selectedJob.urgency || '').toLowerCase() !== 'normal' && (
              <Badge label={`⚡ ${selectedJob.urgency}`} color={['urgent','high'].includes((selectedJob.urgency||'').toLowerCase()) ? '#BA0517' : '#A07E00'} />
            )}
            <span style={{ color: '#706E6B', fontSize: 12 }}>{selectedJob.location || 'Remote'}{selectedJob.experience ? ` · ${selectedJob.experience} exp` : ''}</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(Array.isArray(selectedJob.skills) ? selectedJob.skills.slice(0, 5) : []).map(s => (
                <Badge key={s} label={s.trim()} color="#0176D3" />
              ))}
              {(selectedJob.skills || []).length > 5 && <span style={{ fontSize: 11, color: '#94A3B8' }}>+{selectedJob.skills.length - 5} more</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── No job selected: show all jobs as cards grid ─────────────────── */}
      {!selJob && (
        <div>
          {jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#706E6B' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
              <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px', color: '#0F172A' }}>No jobs assigned yet</p>
              <p style={{ fontSize: 13, margin: '0 0 20px' }}>Ask your admin to assign a job or create one.</p>
              <button onClick={() => navigate('/app/jobs')} style={{ background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                📋 Go to Jobs
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                  {filteredJobs.length} of {jobs.length} job{jobs.length !== 1 ? 's' : ''} assigned to you — click any card to open its pipeline
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    {jobs.reduce((s, j) => s + (j.applicantsCount || 0), 0)} total applicants
                  </span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {filteredJobs.map(j => {
                  const isUrgent = ['urgent','high'].includes((j.urgency || '').toLowerCase());
                  const isDraft  = j.status === 'draft';
                  const cnt      = j.applicantsCount || j.applicationCount || 0;
                  return (
                    <div
                      key={j.id}
                      onClick={() => selectJob(j.id)}
                      style={{ ...card, cursor: 'pointer', padding: '16px', transition: 'all 0.15s', border: `1px solid ${isUrgent ? 'rgba(220,38,38,0.25)' : '#E2E8F0'}` }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#0176D3'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = card.boxShadow; e.currentTarget.style.borderColor = isUrgent ? 'rgba(220,38,38,0.25)' : '#E2E8F0'; }}
                    >
                      {/* Card header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', flex: 1, lineHeight: 1.3 }}>{j.title}</div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {isUrgent && <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(220,38,38,0.1)', color: '#DC2626', padding: '2px 7px', borderRadius: 20 }}>URGENT</span>}
                          {isDraft  && <span style={{ fontSize: 10, fontWeight: 800, background: '#F1F5F9', color: '#94A3B8', padding: '2px 7px', borderRadius: 20 }}>DRAFT</span>}
                          {!isDraft && !isUrgent && <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(46,132,74,0.1)', color: '#2E844A', padding: '2px 7px', borderRadius: 20 }}>ACTIVE</span>}
                        </div>
                      </div>
                      {/* Meta */}
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                        {[j.company || j.companyName, j.location, j.department].filter(Boolean).join(' · ')}
                      </div>
                      {/* Applicant count chip */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ background: cnt > 0 ? 'rgba(1,118,211,0.1)' : '#F1F5F9', color: cnt > 0 ? '#0176D3' : '#94A3B8', fontWeight: 700, fontSize: 13, padding: '4px 12px', borderRadius: 20 }}>
                          {cnt} applicant{cnt !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 12, color: '#0176D3', fontWeight: 600 }}>Open Pipeline →</span>
                      </div>
                      {/* Skills preview */}
                      {(j.skills || []).length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(j.skills || []).slice(0, 3).map(s => (
                            <span key={s} style={{ background: 'rgba(1,118,211,0.07)', color: '#0176D3', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>{s}</span>
                          ))}
                          {(j.skills || []).length > 3 && <span style={{ fontSize: 10, color: '#94A3B8' }}>+{j.skills.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {selJob && (
        <>
          {/* Pipeline Stage Summary */}
          {apps.length > 0 && (
            <div style={{ marginBottom: 16, padding: '14px 18px', background: 'rgba(1,118,211,0.05)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 14 }}>
              <p style={{ color: '#0176D3', fontSize: 10, fontWeight: 700, margin: '0 0 10px', letterSpacing: 1 }}>PIPELINE SNAPSHOT — {apps.length} applicant{apps.length !== 1 ? 's' : ''} total</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STAGES.map(s => {
                  const cnt = stageCounts[s.id] || 0;
                  const pct = apps.length > 0 ? Math.round((cnt / apps.length) * 100) : 0;
                  return (
                    <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 52 }}>
                      <div style={{ width: '100%', height: 4, borderRadius: 4, background: cnt > 0 ? s.color : '#F3F2F2', opacity: cnt > 0 ? 1 : 0.4 }} />
                      <span style={{ color: cnt > 0 ? s.color : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700 }}>{cnt}</span>
                      <span style={{ color: '#706E6B', fontSize: 9, whiteSpace: 'nowrap' }}>{s.label}</span>
                      {cnt > 0 && <span style={{ color: '#706E6B', fontSize: 8 }}>{pct}%</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            <button onClick={() => setSF('all')} style={{ ...(stageFilter === 'all' ? btnP : btnG), padding: '7px 14px', fontSize: 12 }}>All ({apps.length})</button>
            {STAGES.map(s => {
              const cnt = stageCounts[s.id] || 0;
              const isActive = stageFilter === s.id;
              // always show stages that have candidates OR are the currently active filter
              if (!cnt && !isActive) return null;
              return (
                <button
                  key={s.id}
                  onClick={() => setSF(isActive ? 'all' : s.id)}
                  style={{ background: isActive ? `${s.color}33` : '#FFFFFF', border: `1px solid ${isActive ? s.color : `${s.color}44`}`, borderRadius: 12, padding: '7px 14px', fontSize: 12, cursor: 'pointer', color: s.color, whiteSpace: 'nowrap', fontWeight: isActive ? 700 : 500 }}
                >
                  {s.icon} {s.label} ({cnt})
                </button>
              );
            })}
          </div>

          {loading ? (
            <p style={{ color: '#706E6B' }}><Spinner /> Loading…</p>
          ) : (
            <>
              {/* Mobile: collapsible stage sections (≤500px) */}
              <div className="tn-mobile-pipeline" style={{ display: 'none' }}>
                <style>{`
                  @media (max-width: 500px) { .tn-mobile-pipeline { display: block !important; } .tn-desktop-pipeline { display: none !important; } }
                `}</style>
                {filtered.length === 0 && (
                  <div style={{ ...card, textAlign: 'center', padding: 40 }}>
                    <p style={{ color: '#706E6B' }}>No applicants {stageFilter !== 'all' ? `in ${SM[stageFilter]?.label} stage` : ''} yet.</p>
                  </div>
                )}
                {STAGES.map((s, sIdx) => {
                  const stageApps = filtered.filter(a => a.stage === s.id);
                  if (stageApps.length === 0 && stageFilter !== 'all') return null;
                  if (stageApps.length === 0) return null;
                  return (
                    <details key={s.id} className="pipeline-mobile-section" open={sIdx === 0}>
                      <summary>
                        <span style={{ color: s.color }}>{s.icon} {s.label} ({stageApps.length})</span>
                      </summary>
                      <div className="pipeline-mobile-section-body">
                        {stageApps.map(app => (
                          <CandidateCard
                            key={app.id}
                            app={app}
                            isSelected={selectedIds.includes(app.id)}
                            onSelect={toggleSelect}
                            onMoveStage={moveStage}
                            onAnyStage={setAnyStage}
                            onViewDetail={setDetApp}
                            onInterview={(a) => navigate(`/app/forms/interview?appId=${a.id}`)}
                            onReject={(a) => navigate(`/app/forms/reject?appId=${a.id}`)}
                            onPark={handlePark}
                            onOffer={(a) => setOfferModalApp(a)}
                            onToast={setToast}
                            onRefresh={refresh}
                            assessmentId={assessmentData?.id}
                            submission={assessmentData?.submissionsMap?.[String(app.candidate?.id || app.candidate?._id || app.candidateId || '')]}
                            onReviewAssessment={(aId, subId) => navigate(`/app/review/${aId}/${subId}`)}
                            presetTags={presetTags}
                            tagColors={tagColors}
                          />
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>

              {/* Desktop: flat list */}
              <div className="tn-desktop-pipeline" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filtered.length === 0 && (
                  <div style={{ ...card, textAlign: 'center', padding: 40 }}>
                    <p style={{ color: '#706E6B' }}>No applicants {stageFilter !== 'all' ? `in ${SM[stageFilter]?.label} stage` : ''} yet.</p>
                  </div>
                )}
                {filtered.map(app => (
                  <CandidateCard
                    key={app.id}
                    app={app}
                    isSelected={selectedIds.includes(app.id)}
                    onSelect={toggleSelect}
                    onMoveStage={moveStage}
                    onAnyStage={setAnyStage}
                    onViewDetail={setDetApp}
                    onInterview={(app) => navigate(`/app/forms/interview?appId=${app.id}`)}
                    onReject={(app) => navigate(`/app/forms/reject?appId=${app.id}`)}
                    onPark={handlePark}
                    onOffer={(app) => navigate(`/app/forms/offer?appId=${app.id}`)}
                    onToast={setToast}
                    onRefresh={refresh}
                    assessmentId={assessmentData?.id}
                    submission={assessmentData?.submissionsMap?.[String(app.candidate?.id || app.candidate?._id || app.candidateId || '')]}
                    onReviewAssessment={(aId, subId) => navigate(`/app/review/${aId}/${subId}`)}
                    presetTags={presetTags}
                    tagColors={tagColors}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination.pages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, padding: '20px 0', borderTop: '1px solid #e2e8f0' }}>
                  <button 
                    disabled={pagination.page <= 1} 
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    style={{ ...btnG, padding: '8px 16px', opacity: pagination.page <= 1 ? 0.5 : 1 }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button 
                    disabled={pagination.page >= pagination.pages} 
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    style={{ ...btnG, padding: '8px 16px', opacity: pagination.page >= pagination.pages ? 0.5 : 1 }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
