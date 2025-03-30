const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      college_domain: user.college_domain,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      groupId: user.groupId,
      college_domain: user.college_domain,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  // Update user's online status
  const user = await User.findById(req.user._id);
  if (user) {
    user.isOnline = false;
    user.lastSeen = new Date();
    await user.save();
  }

  res.json({ message: 'Logged out successfully' });
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password')
    .populate('groupId', 'name join_code');

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    user.avatar = req.body.avatar || user.avatar;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      groupId: updatedUser.groupId,
      college_domain: updatedUser.college_domain,
      avatar: updatedUser.avatar,
      isAdmin: updatedUser.isAdmin,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Check username availability
// @route   GET /api/auth/check-username/:username
// @access  Public
const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username });
  res.json({ available: !user });
});

// @desc    Get user notifications
// @route   GET /api/auth/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('notifications')
    .populate({
      path: 'notifications.reference',
      select: 'content sender group createdAt',
      populate: {
        path: 'sender',
        select: 'username',
      },
    });

  res.json(user.notifications);
});

// @desc    Mark notifications as read
// @route   PUT /api/auth/notifications/read
// @access  Private
const markNotificationsAsRead = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  await user.markNotificationsAsRead();
  res.json({ message: 'Notifications marked as read' });
});

// @desc    Delete notification
// @route   DELETE /api/auth/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.notifications = user.notifications.filter(
    notification => notification._id.toString() !== req.params.id
  );
  await user.save();
  res.json({ message: 'Notification deleted' });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  checkUsername,
  getNotifications,
  markNotificationsAsRead,
  deleteNotification,
};