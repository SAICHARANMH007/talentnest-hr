import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { card, inp, btnP, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';

function GapBar({ pct }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped < 25 ? '#BA0517' : clamped < 60 ? '#B45309' : '#16A34A';
  return (
    <div style={{ background: '#F1F5F9', borderRadius: 999, height: 8, width: '100%', overflow: 'hidden' }}>
      <div style={{ background: color, height: '100%', width: `${clamped}%`, borderRadius: 999 }} />
    </div>
  );
}

function StudentRecommendationsModal({ student, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStudentSkillRecommendations(student.id)
      .then(r => setData(r?.data || null))
      .catch(e => setError(e.message || 'Failed to load recommendations'))
      .finally(() => setLoading(false));
  }, [student.id]);

  return (
    <Modal title={`📈 Skill Recommendations — ${student.name || 'Student'}`} onClose={onClose} footer={<button onClick={onClose} style={btnG}>Close</button>}>
      {loading && <div style={{ display: 'flex', gap: 10, color: '#706E6B' }}><Spinner /> Loading...</div>}
      {error && <div style={{ color: '#BA0517' }}>{error}</div>}
      {data && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', marginBottom: 6 }}>CURRENT SKILLS</div>
            {data.currentSkills?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.currentSkills.map(s => (
                  <span key={s} style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', background: 'rgba(22,163,74,0.1)', borderRadius: 999, padding: '2px 10px' }}>{s}</span>
                ))}
              </div>
            ) : <div style={{ fontSize: 13, color: '#706E6B' }}>No skills listed on profile yet.</div>}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', marginBottom: 6 }}>RECOMMENDED SKILLS TO LEARN</div>
            {data.recommendations?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.recommendations.map(rec => (
                  <div key={rec.skill} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#181818' }}>{rec.skill}</span>
                      <span style={{ fontSize: 11, color: '#706E6B' }}>{rec.demandCount} open job{rec.demandCount !== 1 ? 's' : ''} need this</span>
                    </div>
                    {rec.courses?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {rec.courses.map(c => (
                          <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#0176D3', fontWeight: 700 }}>🔗 {c.title}</a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize: 13, color: '#706E6B' }}>This student is already covering the most in-demand skills. 🎉</div>}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function CollegeSkillGaps() {
  const [gaps, setGaps] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    api.getCollegeSkillGaps()
      .then(r => { setGaps(r?.data || []); setTotalStudents(r?.totalStudents || 0); })
      .catch(e => setError(e.message || 'Failed to load skill gap analytics'))
      .finally(() => setLoading(false));

    api.getCollegeStudents({ limit: 1000 })
      .then(r => setStudents(r?.data || r?.students || []))
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  }, []);

  const filteredStudents = search.trim()
    ? students.filter(s => (s.name || '').toLowerCase().includes(search.trim().toLowerCase()) || (s.email || '').toLowerCase().includes(search.trim().toLowerCase()))
    : students;

  return (
    <div>
      <PageHeader
        title="📊 Skill Gap Analytics"
        subtitle="See which skills employers are demanding most vs. how many of your students currently have them — plan training sessions to close the biggest gaps."
      />

      {loading && <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>}
      {error && <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>}

      {!loading && !error && (
        gaps.length === 0 ? (
          <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
            Not enough data yet to compute skill gaps. This needs active job postings on the platform and students with skills listed on their profiles.
          </div>
        ) : (
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#181818', marginBottom: 4 }}>Top In-Demand Skills vs. Your Cohort ({totalStudents} students)</div>
            <div style={{ fontSize: 12, color: '#706E6B', marginBottom: 14 }}>Ranked by the gap between employer demand and how many students currently list the skill.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {gaps.map(g => (
                <div key={g.skill}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#181818' }}>{g.skill}</span>
                    <span style={{ fontSize: 12, color: '#706E6B' }}>
                      {g.studentsWithSkill}/{totalStudents} students ({g.coveragePct}%) • {g.demandCount} open job{g.demandCount !== 1 ? 's' : ''} need it
                    </span>
                  </div>
                  <GapBar pct={g.coveragePct} />
                  {g.courses?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {g.courses.map(c => (
                        <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#0176D3', fontWeight: 700 }}>🔗 {c.title}</a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#181818', marginBottom: 4 }}>Per-Student Recommendations</div>
        <div style={{ fontSize: 12, color: '#706E6B', marginBottom: 12 }}>Pick a student to see personalized skill recommendations and courses.</div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search students by name or email..."
          style={{ ...inp, marginBottom: 12 }}
        />
        {studentsLoading ? (
          <div style={{ display: 'flex', gap: 10, color: '#706E6B' }}><Spinner /> Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ color: '#706E6B', fontSize: 13 }}>No students found.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {filteredStudents.slice(0, 200).map(s => (
              <button
                key={s.id || s._id}
                onClick={() => setPicked({ id: s.id || s._id, name: s.name })}
                style={{ ...btnG, fontSize: 12, padding: '6px 14px' }}>
                {s.name || s.email || 'Student'}
              </button>
            ))}
          </div>
        )}
      </div>

      {picked && <StudentRecommendationsModal student={picked} onClose={() => setPicked(null)} />}
    </div>
  );
}
