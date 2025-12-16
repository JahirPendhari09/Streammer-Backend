const { Server } = require('socket.io')
const { MessageModel, GroupModel } = require('./models/message.model');
const { NotificationModel } = require('./models/notification.model');
const mediasoup = require('mediasoup');
const { server } = require('../server');


const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Mediasoup worker
let worker;

// Room state
const rooms = new Map();
const peers = new Map();

// Mediasoup configuration
const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
];

// Initialize mediasoup worker
async function createWorker() {
  worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  console.log(`Mediasoup worker created [pid:${worker.pid}]`);

  worker.on('died', () => {
    console.error('Mediasoup worker died, exiting...');
    setTimeout(() => process.exit(1), 2000);
  });

  return worker;
}

// Create router for a room
async function createRoom(roomId) {
  console.log(`Creating room: ${roomId}`);
  
  const router = await worker.createRouter({ mediaCodecs });
  
  rooms.set(roomId, {
    router,
    peers: new Map(),
    screenSharingPeer: null
  });

  return router;
}

// Get or create router
async function getOrCreateRouter(roomId) {
  if (!rooms.has(roomId)) {
    await createRoom(roomId);
  }
  return rooms.get(roomId);
}

// Initialize worker on startup
createWorker().then(() => {
  console.log('Mediasoup worker ready');
});


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Receive and save message
  socket.on("message", async (data) => {
    try {
      const group = await GroupModel.findOne({ name: data.group });
      if (!group) {
        console.log("Group not found");
        return;
      }

      const newMessage = new MessageModel({
        sender: data.user._id,
        message: data.message,
        toGroup: group._id,
        type: "text"
      });
      await newMessage.save();

      io.to(data.group).emit("receive_message", {
        message: data.message,
        sender: data.user,
        createdAt: newMessage.createdAt,
      });
    } catch (err) {
      console.log("Error saving message:", err);
    }
  });

  socket.on("message_delete", async (data) => {
    try {
      const message = await MessageModel.findById(data.id);
      if (!message) {
        console.log("Message not found");
        return;
      }
      await MessageModel.findByIdAndDelete(data.id);
      
      // Broadcast delete event to room
      io.to(data.group).emit("user_message_deleted", {
        id: data.id,
      });
      console.log("Message deleted:", data.id);
    } catch (err) {
      console.log("Error deleting message:", err);
    }
  });

  // When new notification is triggered
  socket.on("send_notification", async (data) => {
    try {
      const newNotification = new NotificationModel({
        sender: data.senderId,
        receiver: data.receiverId,
        message: data.message,
        type: data.type,
        link: data.link
      });
      await newNotification.save();

      // emit to specific user
      io.to(data.receiverId).emit("receive_notification", newNotification);

      console.log("Notification sent:", newNotification);
    } catch (err) {
      console.log("Error saving notification:", err);
    }
  });

  // Mark Notification as Read
  socket.on("mark_as_read", async (id) => {
    await NotificationModel.findByIdAndUpdate(id, { isRead:true });
  });

  // Join room
  socket.on('join-group', (roomName) => {
    socket.join(roomName);
    console.log('User joined room:', roomName);
  });

  socket.on("join_user", (userId) => {
    socket.join(userId);
    console.log("User joined personal notification room:", userId);
  });
  

  // ========== VIDEO CALL EVENTS ==========

  // Join room
  socket.on('join-room', async ({ roomId, userData }, callback) => {
    try {
      console.log(`${socket.id} joining room ${roomId}`);

      const room = await getOrCreateRouter(roomId);
      const router = room.router;

      // Create peer
      peers.set(socket.id, {
        socket,
        roomId,
        userData,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      });

      room.peers.set(socket.id, peers.get(socket.id));
      socket.join(roomId);

      // Get list of existing peers
      const existingPeers = Array.from(room.peers.keys()).filter(id => id !== socket.id);

      // Send router RTP capabilities
      callback({
        rtpCapabilities: router.rtpCapabilities,
        peers: existingPeers,
        screenSharingPeer: room.screenSharingPeer
      });

      // Notify others about new peer
      socket.to(roomId).emit('peer-joined', {
        peerId: socket.id,
        userData
      });

      console.log(`${socket.id} joined room ${roomId}. Total peers: ${room.peers.size}`);
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ error: error.message });
    }
  });

  // Create WebRTC transport
  socket.on('create-transport', async ({ direction }, callback) => {
    try {
      const peer = peers.get(socket.id);
      if (!peer) return callback({ error: 'Peer not found' });

      const room = rooms.get(peer.roomId);
      const router = room.router;

      const transport = await router.createWebRtcTransport({
        listenIps: [
          { 
            ip: '0.0.0.0', 
            announcedIp: '127.0.0.1' // Change this to your server's public IP in production
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      transport.appData = { direction };
      peer.transports.set(transport.id, transport);

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });

      console.log(`Created ${direction} transport ${transport.id} for ${socket.id}`);
    } catch (error) {
      console.error('Error creating transport:', error);
      callback({ error: error.message });
    }
  });

  // Connect transport
  socket.on('connect-transport', async ({ transportId, dtlsParameters }, callback) => {
    try {
      const peer = peers.get(socket.id);
      if (!peer) return callback({ error: 'Peer not found' });

      const transport = peer.transports.get(transportId);
      if (!transport) return callback({ error: 'Transport not found' });

      await transport.connect({ dtlsParameters });
      callback({ success: true });
      console.log(`Transport ${transportId} connected for ${socket.id}`);
    } catch (error) {
      console.error('Error connecting transport:', error);
      callback({ error: error.message });
    }
  });

  // Produce media
  socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
    try {
      const peer = peers.get(socket.id);
      if (!peer) return callback({ error: 'Peer not found' });

      const room = rooms.get(peer.roomId);
      
      // Check screen sharing restriction
      if (appData && appData.screen) {
        if (room.screenSharingPeer && room.screenSharingPeer !== socket.id) {
          return callback({ error: 'Another user is already sharing screen' });
        }
        room.screenSharingPeer = socket.id;
        io.to(peer.roomId).emit('screen-share-started', { peerId: socket.id });
      }


      const transport = peer.transports.get(transportId);
      if (!transport) return callback({ error: 'Transport not found' });

      const producer = await transport.produce({ kind, rtpParameters, appData });
      peer.producers.set(producer.id, producer);

      producer.on('transportclose', () => {
        console.log('Producer transport closed:', producer.id);
        peer.producers.delete(producer.id);
        
        if (appData && appData.screen) {
          room.screenSharingPeer = null;
          io.to(peer.roomId).emit('screen-share-stopped', { peerId: socket.id });
        }
      });

      callback({ id: producer.id });

      // Notify other peers to consume this producer
      socket.to(peer.roomId).emit('new-producer', {
        peerId: socket.id,
        producerId: producer.id,
        kind,
        appData: appData || {}
      });

      console.log(`Producer ${producer.id} created for ${socket.id}, kind: ${kind}, screen: ${appData?.screen || false}`);
    } catch (error) {
      console.error('Error producing:', error);
      callback({ error: error.message });
    }
  });

  // Consume media
  socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
    try {
      const peer = peers.get(socket.id);
      if (!peer) return callback({ error: 'Peer not found' });

      const room = rooms.get(peer.roomId);
      const router = room.router;

      // Find the producer
      let producerPeer = null;
      let producer = null;
      
      for (const [peerId, p] of room.peers.entries()) {
        for (const [pid, prod] of p.producers.entries()) {
          if (pid === producerId) {
            producerPeer = p;
            producer = prod;
            break;
          }
        }
        if (producer) break;
      }

      if (!producer) return callback({ error: 'Producer not found' });

      if (!router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'Cannot consume' });
      }

      // Get receive transport
      let recvTransport = null;
      for (const [id, transport] of peer.transports.entries()) {
        if (transport.appData.direction === 'recv') {
          recvTransport = transport;
          break;
        }
      }

      if (!recvTransport) {
        return callback({ error: 'No receive transport found' });
      }

      const consumer = await recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: false,
      });

      peer.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        console.log('Consumer transport closed:', consumer.id);
        peer.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        console.log('Consumer producer closed:', consumer.id);
        peer.consumers.delete(consumer.id);
        socket.emit('consumer-closed', { 
          consumerId: consumer.id,
          producerId: producerId
        });
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        appData: producer.appData || {},
      });

      console.log(`Consumer ${consumer.id} created for ${socket.id}, producer: ${producerId}`);
    } catch (error) {
      console.error('Error consuming:', error);
      callback({ error: error.message });
    }
  });

  // Resume consumer
  socket.on('resume-consumer', async ({ consumerId }, callback) => {
    try {
      const peer = peers.get(socket.id);
      if (!peer) return callback({ error: 'Peer not found' });

      const consumer = peer.consumers.get(consumerId);
      if (!consumer) return callback({ error: 'Consumer not found' });

      await consumer.resume();
      callback({ success: true });
      console.log(`Consumer ${consumerId} resumed for ${socket.id}`);
    } catch (error) {
      console.error('Error resuming consumer:', error);
      callback({ error: error.message });
    }
  });

  // Stop screen sharing
  socket.on('stop-screen-share', () => {
    const peer = peers.get(socket.id);
    if (!peer) return;

    const room = rooms.get(peer.roomId);
    if (!room) return;

    if (room.screenSharingPeer === socket.id) {
      room.screenSharingPeer = null;
      
      // Close screen share producers
      for (const [id, producer] of peer.producers.entries()) {
        if (producer.appData && producer.appData.screen) {
          producer.close();
          peer.producers.delete(id);
        }
      }
      
      io.to(peer.roomId).emit('screen-share-stopped', { peerId: socket.id });
      console.log(`Screen sharing stopped by ${socket.id}`);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    const peer = peers.get(socket.id);
    if (!peer) return;

    const room = rooms.get(peer.roomId);
    if (room) {
      // Clear screen sharing if this peer was sharing
      if (room.screenSharingPeer === socket.id) {
        room.screenSharingPeer = null;
        io.to(peer.roomId).emit('screen-share-stopped', { peerId: socket.id });
      }

      room.peers.delete(socket.id);
      socket.to(peer.roomId).emit('peer-left', { peerId: socket.id });

      // Clean up room if empty
      if (room.peers.size === 0) {
        room.router.close();
        rooms.delete(peer.roomId);
        console.log(`Room ${peer.roomId} deleted (empty)`);
      }
    }

    // Close all transports
    for (const transport of peer.transports.values()) {
      transport.close();
    }

    peers.delete(socket.id);
  });
});