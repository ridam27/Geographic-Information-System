// socket.js
// Socket.IO initialization with Redis adapter for pub/sub across processes.
// Exports: initSocket(server) -> returns io instance.
// Usage: const { initSocket } = require('./socket'); const io = initSocket(server);

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function initSocket(server) {
  // Create Socket.IO server attached to the existing http.Server
  const io = new Server(server, {
    cors: { origin: '*' }, // Adjust in production to your allowed origins
    maxHttpBufferSize: 1e6
  });

  // Initialize Redis adapter for Socket.IO (so events are synced across instances)
  (async () => {
    try {
      const pubClient = createClient({ url: REDIS_URL });
      // duplicate() is preferred to create sub client when available
      const subClient = pubClient.duplicate ? pubClient.duplicate() : createClient({ url: REDIS_URL });

      await pubClient.connect();
      await subClient.connect();

      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis adapter initialized');
    } catch (err) {
      console.warn('⚠️ Socket.IO Redis adapter init failed:', err?.message || err);
      // still continue — Socket.IO will work in single-instance mode
    }
  })();

  // Basic connection handlers — customize as needed
  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    // Allow client to join rooms:
    socket.on('join-room', (room) => {
      socket.join(room);
      // optional: acknowledge
      socket.emit('joined-room', room);
    });

    // Example: simple ping handler
    socket.on('ping-server', (payload) => {
      socket.emit('pong', { msg: 'pong', payload });
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', socket.id, 'reason:', reason);
    });
  });

  return io;
}

module.exports = { initSocket };
