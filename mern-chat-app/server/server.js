const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { socketAuth } = require('./middlewares/authMiddleware');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/group'));
app.use('/api/chat', require('./routes/chat'));

// Error handling
app.use(notFound);
app.use(errorHandler);

const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Socket.io middleware
io.use(socketAuth);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);

  // Join user's group room
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.userId} joined group ${groupId}`);
  });

  // Leave group room
  socket.on('leaveGroup', (groupId) => {
    socket.leave(groupId);
    console.log(`User ${socket.userId} left group ${groupId}`);
  });

  // Handle new message
  socket.on('newMessage', (message) => {
    io.to(message.group).emit('message', message);
  });

  // Handle typing events
  socket.on('typing', ({ groupId, username }) => {
    socket.to(groupId).emit('userTyping', username);
  });

  socket.on('stopTyping', ({ groupId, username }) => {
    socket.to(groupId).emit('userStoppedTyping', username);
  });

  // Handle message deletion
  socket.on('deleteMessage', ({ messageId, groupId }) => {
    io.to(groupId).emit('messageDeleted', messageId);
  });

  // Handle message editing
  socket.on('editMessage', (message) => {
    io.to(message.group).emit('messageEdited', message);
  });

  // Handle user presence
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
    io.emit('userOffline', socket.userId);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});