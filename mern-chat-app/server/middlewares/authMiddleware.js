const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Group = require('../models/Group');

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      // Update last seen
      req.user.lastSeen = new Date();
      await req.user.save();

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Socket authentication middleware
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Not authorized, no token'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Not authorized, user not found'));
    }

    // Attach user to socket
    socket.userId = user._id;
    socket.username = user.username;

    // Update user's online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Handle disconnect
    socket.on('disconnect', async () => {
      const user = await User.findById(socket.userId);
      if (user) {
        user.isOnline = false;
        user.lastSeen = new Date();
        await user.save();
      }
    });

    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Not authorized, token failed'));
  }
};

// Admin middleware
const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as admin');
  }
});

// Group member middleware
const groupMember = asyncHandler(async (req, res, next) => {
  try {
    const groupId = req.params.id || req.body.groupId;
    
    if (!groupId) {
      res.status(400);
      throw new Error('Group ID is required');
    }

    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    if (!group.members.includes(req.user._id)) {
      res.status(401);
      throw new Error('Not authorized, not a member of this group');
    }

    req.group = group;
    next();
  } catch (error) {
    res.status(error.status || 500);
    throw error;
  }
});

// Group admin middleware
const groupAdmin = asyncHandler(async (req, res, next) => {
  try {
    const groupId = req.params.id || req.body.groupId;
    
    if (!groupId) {
      res.status(400);
      throw new Error('Group ID is required');
    }

    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    if (!group.admins.includes(req.user._id) && !group.createdBy.equals(req.user._id)) {
      res.status(401);
      throw new Error('Not authorized, not an admin of this group');
    }

    req.group = group;
    next();
  } catch (error) {
    res.status(error.status || 500);
    throw error;
  }
});

// Rate limiting middleware
const rateLimit = (limit, windowMs) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user._id.toString();
    const now = Date.now();
    const userRequests = requests.get(userId) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < windowMs
    );

    if (validRequests.length >= limit) {
      res.status(429);
      throw new Error('Too many requests, please try again later');
    }

    validRequests.push(now);
    requests.set(userId, validRequests);

    next();
  };
};

module.exports = {
  protect,
  socketAuth,
  admin,
  groupMember,
  groupAdmin,
  rateLimit,
};