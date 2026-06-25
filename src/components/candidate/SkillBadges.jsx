import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';

export default function SkillBadges({ candidateSkills = [] }) {
  const navigate = useNavigate();
  const [available, setAvailable]  = useState([]);    // skills with questions in DB
  const [results, setResults]      = useState([]);    // completed attempts
  const [loading, setLoading]      = useState(true);
  const [justSaved, setJustSaved]  = useState(false);

  useEffect(() => {
    if (!candidateSkills.length) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.getAvailableSkills().then(r => r?.skills || []).catch(() => []),
      api.getMySkillResults().then(r => r?.results || []).catch(() => []),
    ]).then(([skills, res]) => {
      setAvailable(skills);
      setResults(res);
    }).finally(() => setLoading(false));
  }, [candidateSkills.length]);

  // Cross-reference: only show assessable skills the candidate has listed
  const assessableSkills = candidateSkills.filter(sk =>
    available.some(a => a.toLowerCase() === sk.toLowerCase())
  );

  if (!candidateSkills.length) return null;
  if (loading) return <div style={{ color: '#9CA3AF', fontSize: 13, padding: '8px 0' }}>Loading assessments…</div>;
  if (!assessableSkills.length) return null;

  const getResult = (skill) => {
    const matches = results.filter(r => r.skill?.toLowerCase() === skill.toLowerCase())
      .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt));
    return matches[0] || null;
  };

  const passedCount = assessableSkills.filter(sk => getResult(sk)?.passed).length;
  const attemptedCount = assessableSkills.filter(sk => getResult(sk)).length;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Skill Assessments</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
            {passedCount}/{assessableSkills.length} passed · {assessableSkills.length - attemptedCount} available to take
          </div>
        </div>
        {passedCount > 0 && (
          <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>
            🏆 {passedCount} Verified
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {assessableSkills.map(skill => {
          const r = getResult(skill);
          return (
            <SkillRow key={skill} skill={skill} result={r} onStart={() => navigate(`/app/skill-assessment/${encodeURIComponent(skill)}`)} />
          );
        })}
      </div>

      {assessableSkills.length < candidateSkills.length && (
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>
          {candidateSkills.length - assessableSkills.length} of your skills don't have assessments yet.
        </p>
      )}
    </div>
  );
}

function SkillRow({ skill, result, onStart }) {
  const passed  = result?.passed;
  const failed  = result && !result.passed;
  const untaken = !result;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 10,
      background: passed ? '#F0FDF4' : failed ? '#FFF7F7' : '#F8FAFF',
      border: `1px solid ${passed ? '#A7F3D0' : failed ? '#FECACA' : '#DBEAFE'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>{passed ? '🏆' : failed ? '📚' : '🎯'}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{skill}</div>
          {result && (
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
              {result.score}/{result.maxScore} pts · {result.percentage}%
              {passed ? ' · Passed' : ' · Not passed'}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {passed && (
          <span style={{ background: '#059669', color: 'white', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>
            ✓ Verified
          </span>
        )}
        <button
          onClick={onStart}
          style={{
            background: passed ? 'transparent' : '#0176D3',
            color: passed ? '#0176D3' : 'white',
            border: passed ? '1px solid #0176D3' : 'none',
            borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {untaken ? 'Take Test' : passed ? 'Retake' : 'Try Again'}
        </button>
      </div>
    </div>
  );
}
