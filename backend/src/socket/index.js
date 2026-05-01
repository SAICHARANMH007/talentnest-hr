'use strict';
// Central IO registry — avoids circular imports between routes and socket handlers
let _io = null;

module.exports = {
  setIO: (io) => { _io = io; },
  getIO: () => _io,
  // Emit to a specific room in a namespace
  emitTo: (namespace, room, event, data) => {
    if (!_io) return;
    try { _io.of(namespace).to(room).emit(event, data); } catch {}
  },
};
