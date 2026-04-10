import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/api.js';
import { btnP, btnG, glass, inp } from '../../constants/styles.js';

const CATEGORIES = [
  'IT Staffing', 'Cybersecurity', 'HR Strategy', 'Recruitment Tips',
  'Industry Trends', 'Career Advice', 'HRMS & Technology', 'Compliance',
];

const ACCENT_COLORS = [
  '#0176D3', '#014486', '#BA0517', '#10B981', '#F59E0B', '#8B5CF6', '#0369a1', '#06B6D4',
];

const EMOJI_OPTIONS = ['📝', '💻', '🔐', '🏢', '🎯', '📊', '🤝', '⚙️', '🚀', '💡', '📈', '🌐'];

const emptyBlog = {
  title: '', slug: '', category: 'IT Staffing', excerpt: '',
  coverImage: '', coverEmoji: '📝', accent: '#0176D3',
  tags: '', published: false, featured: false,
  sections: [{ heading: '', body: '' }],
};

export default function SuperAdminBlogs() {
  const [blogs, setBlogs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('list'); // 'list' | 'create' | 'edit'
  const [form, setForm]         = useState(emptyBlog);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.adminGetBlogs();
      setBlogs(Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []);
    } catch { setBlogs([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-generate slug from title
  const handleTitleChange = (val) => {
    const auto = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm(f => ({ ...f, title: val, slug: editId ? f.slug : auto }));
  };

  const openCreate = () => { setForm(emptyBlog); setEditId(null); setView('create'); };
  const openEdit   = (b) => {
    setForm({
      title: b.title, slug: b.slug, category: b.category, excerpt: b.excerpt,
      coverImage: b.coverImage || '', coverEmoji: b.coverEmoji || '📝',
      accent: b.accent || '#0176D3',
      tags: Array.isArray(b.tags) ? b.tags.join(', ') : '',
      published: !!b.published, featured: !!b.featured,
      sections: b.sections?.length ? b.sections : [{ heading: '', body: '' }],
    });
    setEditId(b._id);
    setView('edit');
  };

  const addSection    = () => setForm(f => ({ ...f, sections: [...f.sections, { heading: '', body: '' }] }));
  const removeSection = (i) => setForm(f => ({ ...f, sections: f.sections.filter((_, x) => x !== i) }));
  const updateSection = (i, field, val) => setForm(f => {
    const secs = [...f.sections];
    secs[i] = { ...secs[i], [field]: val };
    return { ...f, sections: secs };
  });

  const handleSave = async () => {
    if (!form.title.trim()) return showToast('Title is required');
    if (!form.excerpt.trim()) return showToast('Excerpt is required');
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags };
      if (editId) {
        await api.adminUpdateBlog(editId, payload);
        showToast('✅ Blog updated');
      } else {
        await api.adminCreateBlog(payload);
        showToast('✅ Blog created');
      }
      await load();
      setView('list');
    } catch (e) {
      showToast('❌ ' + (e?.message || 'Save failed'));
    }
    setSaving(false);
  };

  const handleTogglePublish = async (b) => {
    try {
      await api.adminTogglePublish(b._id);
      showToast(b.published ? '📝 Moved to draft' : '🚀 Published');
      load();
    } catch { showToast('❌ Failed'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.adminDeleteBlog(deleteId);
      showToast('🗑️ Deleted');
      setDeleteId(null);
      load();
    } catch { showToast('❌ Delete failed'); }
  };

  const filtered = blogs.filter(b =>
    !search || b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── FORM VIEW ────────────────────────────────────────────────────────────
  if (view === 'create' || view === 'edit') {
    return (
      <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
        {/* Toast */}
        {toast && <div style={{ position:'fixed', top:20, right:20, background:'#1e293b', color:'#fff', padding:'12px 20px', borderRadius:10, zIndex:9999, fontSize:14 }}>{toast}</div>}

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => setView('list')} style={{ ...btnG, padding:'8px 16px', fontSize:13 }}>← Back</button>
          <div>
            <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800, color:'#0f172a' }}>
              {editId ? 'Edit Blog Post' : 'Create New Blog Post'}
            </h2>
            <p style={{ margin:0, color:'#64748b', fontSize:13 }}>This will appear on the public marketing blog page</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24, alignItems:'start' }}>
          {/* Left: main content */}
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Title */}
            <div style={{ ...glass, padding:20 }}>
              <label style={labelStyle}>Blog Title *</label>
              <input style={{ ...inp, width:'100%', fontSize:'1rem', fontWeight:600 }}
                value={form.title} onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g. How to Hire a Software Engineer in 5 Days"
              />
              <label style={{ ...labelStyle, marginTop:14 }}>URL Slug</label>
              <input style={{ ...inp, width:'100%', fontFamily:'monospace', fontSize:13 }}
                value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="auto-generated from title"
              />
              <p style={{ color:'#94a3b8', fontSize:12, margin:'4px 0 0' }}>
                Live at: /blog/<strong>{form.slug || 'your-slug'}</strong>
              </p>
            </div>

            {/* Excerpt */}
            <div style={{ ...glass, padding:20 }}>
              <label style={labelStyle}>Excerpt / Summary *</label>
              <textarea style={{ ...inp, width:'100%', minHeight:80, resize:'vertical' }}
                value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                placeholder="A short 1–2 sentence summary shown on the blog listing page..."
              />
            </div>

            {/* Sections */}
            <div style={{ ...glass, padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <label style={{ ...labelStyle, margin:0 }}>Content Sections</label>
                <button onClick={addSection} style={{ ...btnG, padding:'6px 14px', fontSize:12 }}>+ Add Section</button>
              </div>
              {form.sections.map((sec, i) => (
                <div key={i} style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:16, marginBottom:14, background:'#f8fafc' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontWeight:700, color:'#64748b', fontSize:12 }}>SECTION {i + 1}</span>
                    {form.sections.length > 1 && (
                      <button onClick={() => removeSection(i)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:12, fontWeight:600 }}>✕ Remove</button>
                    )}
                  </div>
                  <input style={{ ...inp, width:'100%', marginBottom:10, fontWeight:600 }}
                    value={sec.heading} onChange={e => updateSection(i, 'heading', e.target.value)}
                    placeholder={`Section heading (e.g. Why Speed Matters)`}
                  />
                  <textarea style={{ ...inp, width:'100%', minHeight:120, resize:'vertical', fontSize:13, lineHeight:1.7 }}
                    value={sec.body} onChange={e => updateSection(i, 'body', e.target.value)}
                    placeholder="Write the section content here..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right: metadata */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Publish controls */}
            <div style={{ ...glass, padding:20 }}>
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ ...btnP, flex:1, padding:'10px 0', fontSize:14, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : editId ? 'Update Post' : 'Create Post'}
                </button>
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:10 }}>
                <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>Publish immediately</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>Visible on marketing blog page</div>
                </div>
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>Feature this post</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>Shown as featured on blog page</div>
                </div>
              </label>
            </div>

            {/* Category */}
            <div style={{ ...glass, padding:20 }}>
              <label style={labelStyle}>Category *</label>
              <select style={{ ...inp, width:'100%' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <label style={{ ...labelStyle, marginTop:14 }}>Tags (comma separated)</label>
              <input style={{ ...inp, width:'100%' }}
                value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="IT Staffing, Tech Hiring, Recruiting"
              />
            </div>

            {/* Cover */}
            <div style={{ ...glass, padding:20 }}>
              <label style={labelStyle}>Cover Image URL</label>
              <input style={{ ...inp, width:'100%', fontSize:12 }}
                value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                placeholder="https://images.unsplash.com/..."
              />
              {form.coverImage && (
                <img src={form.coverImage} alt="" style={{ width:'100%', height:100, objectFit:'cover', borderRadius:8, marginTop:8 }} />
              )}

              <label style={{ ...labelStyle, marginTop:14 }}>Cover Emoji</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, coverEmoji: e }))}
                    style={{ width:36, height:36, fontSize:'1.2rem', borderRadius:8, border: form.coverEmoji === e ? '2px solid #0176D3' : '1px solid #e2e8f0', background: form.coverEmoji === e ? '#EFF6FF' : '#fff', cursor:'pointer' }}>
                    {e}
                  </button>
                ))}
              </div>

              <label style={{ ...labelStyle, marginTop:14 }}>Accent Color</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {ACCENT_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, accent: c }))}
                    style={{ width:28, height:28, borderRadius:'50%', background:c, border: form.accent === c ? '3px solid #0f172a' : '2px solid transparent', cursor:'pointer', padding:0, outline:'none' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:'24px' }}>
      {toast && <div style={{ position:'fixed', top:20, right:20, background:'#1e293b', color:'#fff', padding:'12px 20px', borderRadius:10, zIndex:9999, fontSize:14 }}>{toast}</div>}

      {/* Delete confirm modal */}
      {deleteId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, maxWidth:360, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:'2rem', marginBottom:12 }}>🗑️</div>
            <h3 style={{ margin:'0 0 8px', color:'#0f172a' }}>Delete Blog Post?</h3>
            <p style={{ color:'#64748b', fontSize:14, marginBottom:24 }}>This is permanent and cannot be undone.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setDeleteId(null)} style={{ ...btnG, flex:1 }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex:1, padding:'10px 0', background:'#ef4444', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:14 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h2 style={{ margin:0, fontSize:'1.4rem', fontWeight:800, color:'#0f172a' }}>📝 Blog Manager</h2>
          <p style={{ margin:0, color:'#64748b', fontSize:14 }}>
            {blogs.length} total · {blogs.filter(b=>b.published).length} published · {blogs.filter(b=>!b.published).length} drafts
          </p>
        </div>
        <button onClick={openCreate} style={{ ...btnP, padding:'10px 20px', fontSize:14 }}>+ New Blog Post</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom:20 }}>
        <input style={{ ...inp, width:'100%', maxWidth:360 }}
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search by title or category…"
        />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#64748b' }}>Loading blogs…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:60 }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>📝</div>
          <p style={{ color:'#64748b', marginBottom:20 }}>{search ? 'No blogs match your search.' : 'No blog posts yet.'}</p>
          {!search && <button onClick={openCreate} style={{ ...btnP }}>Create Your First Blog Post</button>}
        </div>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {filtered.map(b => (
            <div key={b._id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, transition:'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
            >
              {/* Emoji + accent */}
              <div style={{ width:48, height:48, borderRadius:12, background:`${b.accent}18`, border:`1.5px solid ${b.accent}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', flexShrink:0 }}>
                {b.coverEmoji || '📝'}
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <h3 style={{ margin:0, fontWeight:700, fontSize:'0.95rem', color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:400 }}>{b.title}</h3>
                  {b.featured && <span style={{ background:'#FEF3C7', color:'#92400E', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100 }}>⭐ Featured</span>}
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ background:`${b.accent}18`, color:b.accent, fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:100 }}>{b.category}</span>
                  <span style={{ color:'#94a3b8', fontSize:12 }}>{b.readTime}</span>
                  <span style={{ color:'#94a3b8', fontSize:12 }}>{b.sections?.length || 0} sections</span>
                  {b.views > 0 && <span style={{ color:'#94a3b8', fontSize:12 }}>👁 {b.views}</span>}
                </div>
              </div>

              {/* Status + actions */}
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <span style={{
                  padding:'4px 12px', borderRadius:100, fontSize:12, fontWeight:700,
                  background: b.published ? '#D1FAE5' : '#F1F5F9',
                  color: b.published ? '#065F46' : '#64748B',
                }}>
                  {b.published ? '✅ Published' : '📝 Draft'}
                </span>
                <button onClick={() => handleTogglePublish(b)}
                  style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, color:'#0176D3', cursor:'pointer' }}>
                  {b.published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => openEdit(b)}
                  style={{ background:'none', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, color:'#334155', cursor:'pointer' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => setDeleteId(b._id)}
                  style={{ background:'none', border:'1px solid #fee2e2', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, color:'#ef4444', cursor:'pointer' }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display:'block', fontWeight:600, fontSize:13, color:'#374151', marginBottom:6 };
