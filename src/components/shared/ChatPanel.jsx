import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api } from '../../api/api.js';
import { API_BASE_URL } from '../../api/config.js';

const CHAT_SOCKET_URL = API_BASE_URL.replace('/api', '');

const ROLE_COLOR = { candidate: '#0176D3', recruiter: '#7c3aed', admin: '#d97706', super_admin: '#059669' };
const ROLE_LABEL = { candidate: 'Candidate', recruiter: 'Recruiter', admin: 'Admin', super_admin: 'Super Admin' };

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function fmt(d) {
  if (!d) return '';
  const date = new Date(d);
  const now  = new Date();
  const diffD = Math.floor((now - date) / 86400000);
  if (diffD === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7)  return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtFull(d) {
  if (!d) return '';
  return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtLastSeen(d) {
  if (!d) return 'Offline';
  const diffMs = Date.now() - new Date(d).getTime();
  if (diffMs < 2 * 60 * 1000) return 'Online';
  if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 24 * 60 * 60 * 1000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

function Avatar({ name, role, size = 36, online }) {
  const color = ROLE_COLOR[role] || '#64748b';
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize: size * 0.38 }}>
        {(name || '?')[0].toUpperCase()}
      </div>
      {online !== undefined && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size * 0.3, height: size * 0.3, borderRadius: '50%',
          background: online ? '#22c55e' : '#d1d5db',
          border: '2px solid #fff',
        }} />
      )}
    </div>
  );
}

function AttachmentBubble({ attachment, isMine }) {
  const isPdf = attachment.type === 'application/pdf' || attachment.name?.endsWith('.pdf');
  const isImg = attachment.type?.startsWith('image/');

  const download = () => {
    const a = document.createElement('a');
    a.href = attachment.data;
    a.download = attachment.name;
    a.click();
  };

  if (isImg) {
    return (
      <div style={{ maxWidth: 240, cursor: 'pointer' }} onClick={download}>
        <img src={attachment.data} alt={attachment.name} style={{ width: '100%', borderRadius: 10, display: 'block' }} />
        <div style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.7)' : '#9E9D9B', marginTop: 3 }}>{attachment.name}</div>
      </div>
    );
  }

  return (
    <div onClick={download} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(1,118,211,0.06)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', border: `1px solid ${isMine ? 'rgba(255,255,255,0.2)' : 'rgba(1,118,211,0.15)'}` }}>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{isPdf ? '📄' : '📎'}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isMine ? '#fff' : '#181818', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{attachment.name}</div>
        <div style={{ fontSize: 11, color: isMine ? 'rgba(255,255,255,0.65)' : '#9E9D9B' }}>
          {attachment.size ? `${(attachment.size / 1024).toFixed(0)} KB` : ''} · Click to download
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, myId, onReply }) {
  const isMine = msg.fromUserId?.toString() === myId?.toString();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end', position: 'relative' }}
    >
      {!isMine && <Avatar name={msg.fromName} role={msg.fromRole} size={28} />}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        {!isMine && (
          <div style={{ fontSize: 11, color: '#9E9D9B', marginBottom: 3, paddingLeft: 4 }}>{msg.fromName}</div>
        )}

        {/* Reply-to quote */}
        {msg.replyTo && (
          <div style={{ background: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(1,118,211,0.07)', borderLeft: `3px solid ${isMine ? 'rgba(255,255,255,0.5)' : '#0176D3'}`, borderRadius: '8px 8px 0 0', padding: '6px 10px', marginBottom: -4, maxWidth: '100%' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: isMine ? 'rgba(255,255,255,0.8)' : '#0176D3', marginBottom: 2 }}>{msg.replyTo.fromName}</div>
            <div style={{ fontSize: 11, color: isMine ? 'rgba(255,255,255,0.7)' : '#706E6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
              {msg.replyTo.isAttachment ? '📎 Attachment' : msg.replyTo.message}
            </div>
          </div>
        )}

        <div style={{ background: isMine ? 'linear-gradient(135deg,#0176D3,#014486)' : '#F3F4F6', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: msg.attachment && !msg.message ? '8px' : '10px 14px', color: isMine ? '#fff' : '#181818', fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          {msg.attachment && <AttachmentBubble attachment={msg.attachment} isMine={isMine} />}
          {msg.message && <div style={{ marginTop: msg.attachment ? 6 : 0 }}>{msg.message}</div>}
        </div>

        {msg.jobTitle && (
          <div style={{ fontSize: 10, color: '#0176D3', marginTop: 3, paddingLeft: 2 }}>💼 {msg.jobTitle}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, paddingLeft: 2 }}>
          <span style={{ fontSize: 10, color: '#C9C7C5' }}>{fmtFull(msg.createdAt)}</span>
          {isMine && (
            <span style={{ fontSize: 10, color: msg.readAt ? '#22c55e' : '#C9C7C5' }} title={msg.readAt ? `Seen ${fmtFull(msg.readAt)}` : 'Delivered'}>
              {msg.readAt ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>

      {/* Reply button — appears on hover */}
      {hovered && (
        <button
          onClick={() => onReply(msg)}
          title="Reply"
          style={{ alignSelf: 'center', background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, order: isMine ? -1 : 1, marginBottom: 20 }}
        >
          ↩
        </button>
      )}
    </div>
  );
}

function ContactItem({ contact, active, onClick, online }) {
  const color = ROLE_COLOR[contact.role] || '#64748b';
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: active ? 'rgba(1,118,211,0.08)' : 'transparent', borderLeft: active ? '3px solid #0176D3' : '3px solid transparent', transition: 'background 0.15s' }}>
      <Avatar name={contact.name} role={contact.role} size={38} online={online} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#181818', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{contact.name}</span>
          <span style={{ fontSize: 10, color: '#9E9D9B', flexShrink: 0 }}>{fmt(contact.lastAt)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#706E6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{contact.lastMsg || '—'}</span>
          {contact.unread > 0 && (
            <span style={{ background: '#0176D3', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{contact.unread}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <span style={{ fontSize: 10, color, background: `${color}15`, borderRadius: 20, padding: '1px 7px', fontWeight: 600 }}>{ROLE_LABEL[contact.role] || contact.role}</span>
          {online && <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>● Online</span>}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({ open, onClose, myUser, initialRecipient }) {
  const [contacts, setContacts]         = useState([]);
  const [active, setActive]             = useState(null);
  const [thread, setThread]             = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingThread,   setLoadingThread]   = useState(false);
  const [text, setText]                 = useState('');
  const [sending, setSending]           = useState(false);
  const [attachment, setAttachment]     = useState(null);
  const [newRecipEmail, setNewRecipEmail] = useState('');
  const [newRecipResult, setNewRecipResult] = useState(null);
  const [showNewChat, setShowNewChat]   = useState(false);
  const [searchContacts, setSearchContacts] = useState('');
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [onlineIds, setOnlineIds]       = useState(new Set());
  const [activeLastSeen, setActiveLastSeen] = useState(null);
  const [replyTo, setReplyTo]           = useState(null);
  const [typingUser, setTypingUser] = useState(null); // name of person typing
  const bottomRef   = useRef(null);
  const fileRef     = useRef(null);
  const pollRef     = useRef(null);
  const onlinePoll  = useRef(null);
  const chatSocket  = useRef(null);
  const activeRef   = useRef(null);   // mirror of active for socket closures
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  const isMobile    = useIsMobile();
  const myId = myUser?._id || myUser?.id;

  const loadContacts = useCallback(async () => {
    try {
      const r = await api.getMessageContacts();
      setContacts(Array.isArray(r?.data) ? r.data : []);
    } catch { setContacts([]); }
    setLoadingContacts(false);
  }, []);

  const loadThread = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingThread(true);
    try {
      const r = await api.getMessageThread(userId);
      setThread(Array.isArray(r?.data) ? r.data : []);
    } catch { setThread([]); }
    setLoadingThread(false);
  }, []);

  const loadOnline = useCallback(async () => {
    try {
      const r = await api.getOnlineUsers();
      const list = Array.isArray(r?.data) ? r.data : [];
      setOnlineIds(new Set(list.map(u => u.id)));
      // update active contact's lastSeen if they're in the list
      if (active) {
        const match = list.find(u => u.id === active.userId);
        setActiveLastSeen(match ? new Date() : activeLastSeen);
      }
    } catch {}
  }, [active, activeLastSeen]);

  useEffect(() => {
    if (!open) return;
    loadContacts();
    loadOnline();
    onlinePoll.current = setInterval(loadOnline, 30_000);
    return () => clearInterval(onlinePoll.current);
  }, [open]); // eslint-disable-line

  useEffect(() => {
    if (!open || !initialRecipient) return;
    const contact = {
      userId: initialRecipient.userId || initialRecipient._id || initialRecipient.id,
      name  : initialRecipient.name,
      role  : initialRecipient.role,
    };
    setActive(contact);
    setMobileShowThread(true);
    loadThread(contact.userId);
  }, [open, initialRecipient, loadThread]);

  // ── Socket.IO real-time chat ────────────────────────────────────────────
  useEffect(() => {
    if (!open || !myId) return;
    const token = sessionStorage.getItem('tn_token') || '';
    const socket = io(`${CHAT_SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
      reconnectionAttempts: Infinity,
    });
    chatSocket.current = socket;

    socket.on('message:new', (msg) => {
      const cur = activeRef.current;
      const msgFrom = String(msg.fromUserId);
      const msgTo   = String(msg.toUserId);
      const myIdStr = String(myId);
      // Only append if this message belongs to the active conversation
      if (cur && (msgFrom === cur.userId || msgTo === cur.userId)) {
        setThread(prev => {
          // Deduplicate by _id
          if (prev.some(m => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        // Update contacts last message
        const otherUserId = msgFrom === myIdStr ? msgTo : msgFrom;
        setContacts(prev => prev.map(c => c.userId === otherUserId ? { ...c, lastMsg: msg.message || '📎', lastAt: msg.createdAt } : c));
      } else if (msgTo === myIdStr) {
        // Message for me but different conversation — bump unread
        setContacts(prev => {
          const exists = prev.find(c => c.userId === msgFrom);
          if (exists) return prev.map(c => c.userId === msgFrom ? { ...c, unread: (c.unread || 0) + 1, lastMsg: msg.message || '📎', lastAt: msg.createdAt } : c);
          return prev; // loadContacts will refresh if needed
        });
      }
    });

    socket.on('typing', ({ fromUserId, name }) => {
      if (activeRef.current?.userId === String(fromUserId)) setTypingUser(name);
    });
    socket.on('typing-stop', ({ fromUserId }) => {
      if (activeRef.current?.userId === String(fromUserId)) setTypingUser(null);
    });

    // After reconnect, reload thread to catch any missed messages
    socket.on('connect', () => {
      const cur = activeRef.current;
      if (cur) { loadThread(cur.userId); socket.emit('join-conv', { withUserId: cur.userId }); }
    });

    return () => { socket.disconnect(); chatSocket.current = null; };
  }, [open, myId]); // eslint-disable-line

  // Keep active ref in sync and join/leave conversation rooms
  useEffect(() => {
    activeRef.current = active;
    const socket = chatSocket.current;
    if (!socket || !active) return;
    socket.emit('join-conv', { withUserId: active.userId });
    return () => { socket.emit('leave-conv', { withUserId: active.userId }); };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    loadThread(active.userId);
  }, [active, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const selectContact = (c) => {
    setActive(c);
    setMobileShowThread(true);
    setReplyTo(null);
    loadThread(c.userId);
    // mark as read immediately in contacts list
    setContacts(prev => prev.map(x => x.userId === c.userId ? { ...x, unread: 0 } : x));
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8_000_000) { alert('File too large — max 8 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment({ name: file.name, type: file.type, size: file.size, data: ev.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const emitTyping = useCallback((withUserId) => {
    const socket = chatSocket.current;
    if (!socket || !withUserId) return;
    if (!isTypingRef.current) { isTypingRef.current = true; socket.emit('typing-start', { withUserId }); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing-stop', { withUserId });
    }, 2000);
  }, []);

  const send = async () => {
    if ((!text.trim() && !attachment) || !active || sending) return;
    // Stop typing indicator
    isTypingRef.current = false;
    clearTimeout(typingTimer.current);
    chatSocket.current?.emit('typing-stop', { withUserId: active.userId });
    setSending(true);
    const msgText = text.trim();
    const curReplyTo = replyTo;
    setText('');
    setAttachment(null);
    setReplyTo(null);
    try {
      const r = await api.sendMessage({ toUserId: active.userId, message: msgText, attachment: attachment || undefined, replyTo: curReplyTo || undefined });
      const newMsg = r?.data || r;
      setThread(prev => [...prev, newMsg]);
      // bump contact to top of list
      setContacts(prev => {
        const updated = prev.map(c => c.userId === active.userId
          ? { ...c, lastMsg: msgText || (attachment ? `📎 ${attachment.name}` : ''), lastAt: new Date().toISOString() }
          : c
        );
        const idx = updated.findIndex(c => c.userId === active.userId);
        if (idx > 0) {
          const [item] = updated.splice(idx, 1);
          updated.unshift(item);
        }
        return updated;
      });
    } catch (e) {
      setText(msgText); // restore text on failure
      alert(e.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const searchUser = async () => {
    if (!newRecipEmail.trim()) return;
    try {
      const r = await api.getUsers();
      const all = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      const found = all.find(u => u.email?.toLowerCase() === newRecipEmail.trim().toLowerCase());
      setNewRecipResult(found || 'notfound');
    } catch { setNewRecipResult('notfound'); }
  };

  const startChat = (user) => {
    const contact = { userId: user._id || user.id, name: user.name, role: user.role };
    setActive(contact);
    setMobileShowThread(true);
    setShowNewChat(false);
    setNewRecipEmail('');
    setNewRecipResult(null);
    loadThread(contact.userId);
  };

  if (!open) return null;

  const filteredContacts = contacts.filter(c =>
    !searchContacts ||
    c.name?.toLowerCase().includes(searchContacts.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchContacts.toLowerCase())
  );

  const activeIsOnline = active ? onlineIds.has(active.userId) : false;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 'min(860px, 98vw)', height: 'min(640px, 95vh)',
        background: '#fff', borderRadius: 20, zIndex: 9001,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        display: 'flex', overflow: 'hidden',
      }}>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <div style={{
          width: isMobile ? '100%' : 280,
          borderRight: '1px solid #F3F2F2',
          display: isMobile ? (mobileShowThread ? 'none' : 'flex') : 'flex',
          flexDirection: 'column', background: '#FAFAFA',
          flexShrink: 0,
        }}>
          <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '16px 16px 12px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <span style={{ fontWeight: 800, fontSize: 15, flex: 1 }}>Messages</span>
            <button onClick={() => setShowNewChat(p => !p)} title="New chat" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 16, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
          </div>

          {showNewChat && (
            <div style={{ padding: '10px 12px', background: '#EEF4FF', borderBottom: '1px solid #D8E9FF' }}>
              <div style={{ fontSize: 12, color: '#0176D3', fontWeight: 700, marginBottom: 6 }}>Start new chat</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={newRecipEmail}
                  onChange={e => { setNewRecipEmail(e.target.value); setNewRecipResult(null); }}
                  onKeyDown={e => e.key === 'Enter' && searchUser()}
                  placeholder="Search by email…"
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(1,118,211,0.3)', fontSize: 12, outline: 'none', background: '#fff' }}
                />
                <button onClick={searchUser} style={{ background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>→</button>
              </div>
              {newRecipResult === 'notfound' && <div style={{ fontSize: 11, color: '#BA0517', marginTop: 6 }}>No user found.</div>}
              {newRecipResult && newRecipResult !== 'notfound' && (
                <div onClick={() => startChat(newRecipResult)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 10px', background: '#fff', borderRadius: 10, border: '1px solid rgba(1,118,211,0.2)', cursor: 'pointer' }}>
                  <Avatar name={newRecipResult.name} role={newRecipResult.role} size={30} online={onlineIds.has(newRecipResult._id || newRecipResult.id)} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{newRecipResult.name}</div>
                    <div style={{ fontSize: 11, color: '#706E6B' }}>{ROLE_LABEL[newRecipResult.role] || newRecipResult.role}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ padding: '8px 10px' }}>
            <input
              value={searchContacts}
              onChange={e => setSearchContacts(e.target.value)}
              placeholder="Search conversations…"
              style={{ width: '100%', padding: '7px 12px', borderRadius: 8, border: '1px solid #E8E7E5', fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingContacts ? (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E8E7E5', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, background: '#E8E7E5', borderRadius: 6, marginBottom: 6, width: '60%' }} />
                      <div style={{ height: 10, background: '#F3F2F2', borderRadius: 6, width: '80%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>💬</div>
                <div style={{ color: '#706E6B', fontSize: 12 }}>No conversations yet.</div>
                <div style={{ color: '#9E9D9B', fontSize: 11, marginTop: 4 }}>Click ✎ to start a new chat</div>
              </div>
            ) : (
              filteredContacts.map(c => (
                <ContactItem
                  key={c.userId}
                  contact={c}
                  active={active?.userId === c.userId}
                  onClick={() => selectContact(c)}
                  online={onlineIds.has(c.userId)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Thread ───────────────────────────────────────────── */}
        <div style={{
          flex: 1, display: isMobile ? (mobileShowThread ? 'flex' : 'none') : 'flex',
          flexDirection: 'column', minWidth: 0,
        }}>
          {active ? (
            <>
              {/* Thread header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F2F2', display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAFA' }}>
                {isMobile && (
                  <button onClick={() => setMobileShowThread(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#0176D3', padding: '0 4px 0 0', lineHeight: 1 }}>‹</button>
                )}
                <Avatar name={active.name} role={active.role} size={36} online={activeIsOnline} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#181818' }}>{active.name}</div>
                  <div style={{ fontSize: 11, color: activeIsOnline ? '#22c55e' : '#9E9D9B', fontWeight: activeIsOnline ? 600 : 400 }}>
                    {activeIsOnline ? '● Online now' : ROLE_LABEL[active.role] || active.role}
                  </div>
                </div>
                {/* Call buttons — only when recipient is online */}
                {activeIsOnline && (
                  <>
                    <button title="Audio Call" onClick={() => window.__tnStartCall?.(active.userId, active.name, 'audio')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#0176D3', padding: '4px 6px', borderRadius: 6 }}>📞</button>
                    <button title="Video Call" onClick={() => window.__tnStartCall?.(active.userId, active.name, 'video')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#0176D3', padding: '4px 6px', borderRadius: 6 }}>📹</button>
                  </>
                )}
                {!isMobile && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9E9D9B', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
                {loadingThread ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                    {[1,2,3,4].map((i, idx) => (
                      <div key={i} style={{ display: 'flex', flexDirection: idx % 2 === 0 ? 'row' : 'row-reverse', gap: 8, alignItems: 'flex-end' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E8E7E5', flexShrink: 0 }} />
                        <div style={{ height: 38, background: '#F3F4F6', borderRadius: 12, width: `${40 + idx * 15}%` }} />
                      </div>
                    ))}
                  </div>
                ) : thread.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
                    <div style={{ color: '#706E6B', fontSize: 13 }}>Start the conversation with {active.name}</div>
                  </div>
                ) : (
                  thread.map(m => (
                    <MessageBubble
                      key={m._id}
                      msg={m}
                      myId={myId}
                      onReply={msg => {
                        setReplyTo({
                          msgId: msg._id,
                          fromName: msg.fromName,
                          message: msg.message || '',
                          isAttachment: !msg.message && !!msg.attachment,
                        });
                      }}
                    />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply preview strip */}
              {replyTo && (
                <div style={{ padding: '8px 16px', background: '#EEF4FF', borderTop: '1px solid #D8E9FF', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, borderLeft: '3px solid #0176D3', paddingLeft: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', marginBottom: 2 }}>Replying to {replyTo.fromName}</div>
                    <div style={{ fontSize: 11, color: '#706E6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {replyTo.isAttachment ? '📎 Attachment' : replyTo.message}
                    </div>
                  </div>
                  <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#9E9D9B', fontSize: 18, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>×</button>
                </div>
              )}

              {/* Attachment preview */}
              {attachment && (
                <div style={{ padding: '6px 16px', background: '#EEF4FF', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #D8E9FF' }}>
                  <span style={{ fontSize: 18 }}>{attachment.type?.startsWith('image/') ? '🖼' : '📎'}</span>
                  <span style={{ fontSize: 12, color: '#0176D3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</span>
                  <span style={{ fontSize: 11, color: '#9E9D9B' }}>{(attachment.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', color: '#BA0517', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
              )}

              {/* Typing indicator */}
              {typingUser && (
                <div style={{ padding: '3px 16px', fontSize: 11, color: '#706E6B', fontStyle: 'italic', borderTop: '1px solid #F3F2F2' }}>
                  {typingUser} is typing…
                </div>
              )}

              {/* Input bar */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid #F3F2F2', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" style={{ display: 'none' }} onChange={pickFile} />
                <button onClick={() => fileRef.current?.click()} title="Attach file (PDF, image, doc — max 8 MB)" style={{ background: 'none', border: '1px solid #E8E7E5', borderRadius: 10, color: '#706E6B', fontSize: 18, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📎</button>
                <textarea
                  value={text}
                  onChange={e => { setText(e.target.value); if (active) emitTyping(active.userId); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  style={{ flex: 1, padding: '9px 14px', background: '#F8FAFF', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 12, color: '#181818', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.45, maxHeight: 120, overflowY: 'auto' }}
                />
                <button
                  onClick={send}
                  disabled={sending || (!text.trim() && !attachment)}
                  style={{ background: 'linear-gradient(135deg,#0176D3,#014486)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, width: 38, height: 38, cursor: 'pointer', fontSize: 16, opacity: (sending || (!text.trim() && !attachment)) ? 0.5 : 1, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sending ? '…' : '➤'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#706E6B' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#181818', marginBottom: 6 }}>TalentNest Chat</div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>Select a conversation from the left, or click ✎ to start a new chat</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
