// ─────────────────────────────────────────────────────────────
// REALTIME — Discord-style live rooms over raw websockets (ws).
// join/leave/message/react/typing + per-channel presence +
// per-user sliding-window rate limit. In-memory by design; the
// DB is the source of truth, this is just the pub/sub layer.
// ─────────────────────────────────────────────────────────────
const { WebSocketServer } = require('ws');

const RATE_LIMIT = 60;          // events
const RATE_WINDOW_MS = 60000;   // per minute

function attach(httpServer, { userByToken, toggleReaction, broadcastPersisted }) {
  const wss = new WebSocketServer({ noServer: true });
  const channels = new Map(); // slug -> Set<ws>
  const sockets = new Map();  // ws -> { user, joined:Set<string>, stamps:number[] }

  const room = (slug) => {
    if (!channels.has(slug)) channels.set(slug, new Set());
    return channels.get(slug);
  };

  function send(ws, obj) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  }

  function broadcast(slug, obj, except) {
    const raw = JSON.stringify(obj);
    for (const ws of room(slug)) {
      if (ws !== except && ws.readyState === ws.OPEN) ws.send(raw);
    }
  }

  function presence(slug) {
    const users = [];
    for (const ws of room(slug)) {
      const s = sockets.get(ws);
      if (s) users.push({ id: s.user.id, handle: s.user.handle, academyId: s.user.academy_id });
    }
    return users;
  }

  function pushPresence(slug) {
    broadcast(slug, { type: 'presence', channel: slug, users: presence(slug) });
  }

  function rateLimited(state) {
    const now = Date.now();
    state.stamps = state.stamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (state.stamps.length >= RATE_LIMIT) return true;
    state.stamps.push(now);
    return false;
  }

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/ws') return socket.destroy();
    const user = userByToken(url.searchParams.get('token'));
    if (!user) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => {
      sockets.set(ws, { user, joined: new Set(), stamps: [] });
      send(ws, { type: 'hello', you: { id: user.id, handle: user.handle, academyId: user.academy_id } });

      ws.on('message', (raw) => {
        const s = sockets.get(ws);
        if (!s) return;
        let msg;
        try { msg = JSON.parse(String(raw)); } catch { return; }
        if (rateLimited(s)) return send(ws, { type: 'error', reason: 'SLOW DOWN — 60 EVENTS/MIN CAP' });

        if (msg.type === 'join') {
          const slug = String(msg.channel || '');
          if (!slug || s.joined.has(slug)) return;
          s.joined.add(slug);
          room(slug).add(ws);
          send(ws, { type: 'joined', channel: slug });
          pushPresence(slug);
        } else if (msg.type === 'leave') {
          const slug = String(msg.channel || '');
          if (!s.joined.delete(slug)) return;
          room(slug).delete(ws);
          pushPresence(slug);
        } else if (msg.type === 'message') {
          const slug = String(msg.channel || '');
          if (!s.joined.has(slug)) return;
          const saved = broadcastPersisted(s.user, slug, String(msg.text || ''));
          if (saved) broadcast(slug, { type: 'message', channel: slug, message: saved });
        } else if (msg.type === 'react') {
          const slug = String(msg.channel || '');
          const r = toggleReaction(slug, msg.messageId, s.user, String(msg.emoji || '').slice(0, 8));
          if (r) broadcast(slug, { type: 'reaction', channel: slug, messageId: r.id, seq: r.seq, reactions: r.reactions });
        } else if (msg.type === 'typing') {
          const slug = String(msg.channel || '');
          if (!s.joined.has(slug)) return;
          broadcast(slug, { type: 'typing', channel: slug, user: { handle: s.user.handle } }, ws);
        }
      });

      ws.on('close', () => {
        const s = sockets.get(ws);
        if (!s) return;
        for (const slug of s.joined) {
          room(slug).delete(ws);
          pushPresence(slug);
        }
        sockets.delete(ws);
      });
    });
  });

  /** REST-posted messages also fan out to live sockets */
  function broadcastMessage(slug, message) {
    broadcast(slug, { type: 'message', channel: slug, message });
  }
  function broadcastReaction(slug, r) {
    broadcast(slug, { type: 'reaction', channel: slug, messageId: r.id, seq: r.seq, reactions: r.reactions });
  }

  return { wss, broadcastMessage, broadcastReaction };
}

module.exports = { attach };
