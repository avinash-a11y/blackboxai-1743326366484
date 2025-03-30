const asyncHandler = require('express-async-handler');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const bcrypt = require('bcryptjs');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = asyncHandler(async (req, res) => {
  const { name, password } = req.body;

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const group = await Group.create({
    name,
    password: hashedPassword,
    createdBy: req.user._id,
    members: [req.user._id],
    admins: [req.user._id],
    college_domain: req.user.college_domain,
  });

  // Update user's group
  await User.findByIdAndUpdate(req.user._id, { groupId: group._id });

  res.status(201).json(group);
});

// @desc    Join a group
// @route   POST /api/groups/join
// @access  Private
const joinGroup = asyncHandler(async (req, res) => {
  const { join_code, password } = req.body;

  const group = await Group.findOne({ join_code });

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Check if group is full
  if (group.isFull()) {
    res.status(400);
    throw new Error('Group is full');
  }

  // Check if user is banned
  if (group.isBanned(req.user._id)) {
    res.status(403);
    throw new Error('You are banned from this group');
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, group.password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid password');
  }

  // Check college domain restriction
  if (group.college_domain && group.college_domain !== req.user.college_domain) {
    res.status(403);
    throw new Error('This group is restricted to members of the same college');
  }

  // Add user to group
  if (group.settings.requireApproval) {
    await group.addPendingMember(req.user._id);
    res.json({ message: 'Join request sent. Waiting for approval.' });
  } else {
    group.addMember(req.user._id);
    await group.save();

    // Update user's group
    await User.findByIdAndUpdate(req.user._id, { groupId: group._id });

    res.json(group);
  }
});

// @desc    Leave group
// @route   POST /api/groups/leave
// @access  Private
const leaveGroup = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const group = await Group.findById(user.groupId);

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  // Check if user is the creator
  if (group.createdBy.equals(user._id)) {
    res.status(400);
    throw new Error('Group creator cannot leave. Delete the group instead.');
  }

  // Remove user from group
  group.removeMember(user._id);
  await group.save();

  // Update user's group
  user.groupId = null;
  await user.save();

  res.json({ message: 'Left group successfully' });
});

// @desc    Get group details
// @route   GET /api/groups/:id
// @access  Private/GroupMember
const getGroupDetails = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate('members', 'username email isOnline lastSeen avatar')
    .populate('admins', 'username')
    .populate('createdBy', 'username')
    .populate('pendingMembers.user', 'username email')
    .populate('bannedMembers.user', 'username')
    .populate('bannedMembers.bannedBy', 'username');

  res.json(group);
});

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private/GroupAdmin
const updateGroup = asyncHandler(async (req, res) => {
  const group = req.group; // From middleware

  const {
    name,
    description,
    password,
    maxMembers,
    isPrivate,
    settings,
  } = req.body;

  if (name) group.name = name;
  if (description) group.description = description;
  if (maxMembers) group.maxMembers = maxMembers;
  if (typeof isPrivate !== 'undefined') group.isPrivate = isPrivate;
  if (settings) group.settings = { ...group.settings, ...settings };

  if (password) {
    const salt = await bcrypt.genSalt(10);
    group.password = await bcrypt.hash(password, salt);
  }

  const updatedGroup = await group.save();
  res.json(updatedGroup);
});

// @desc    Get online members
// @route   GET /api/groups/:id/online
// @access  Private/GroupMember
const getOnlineMembers = asyncHandler(async (req, res) => {
  const onlineMembers = await User.find({
    _id: { $in: req.group.members },
    isOnline: true,
  }).select('username lastSeen');

  res.json(onlineMembers);
});

// @desc    Generate new join code
// @route   POST /api/groups/:id/new-code
// @access  Private/GroupAdmin
const generateNewJoinCode = asyncHandler(async (req, res) => {
  const group = req.group; // From middleware
  await group.generateNewJoinCode();
  res.json({ join_code: group.join_code });
});

// @desc    Approve join request
// @route   POST /api/groups/:id/approve/:userId
// @access  Private/GroupAdmin
const approveJoinRequest = asyncHandler(async (req, res) => {
  const group = req.group;
  const userId = req.params.userId;

  if (group.isFull()) {
    res.status(400);
    throw new Error('Group is full');
  }

  await group.removePendingMember(userId);
  group.addMember(userId);
  await group.save();

  // Update user's group
  await User.findByIdAndUpdate(userId, { groupId: group._id });

  res.json({ message: 'Join request approved' });
});

// @desc    Reject join request
// @route   POST /api/groups/:id/reject/:userId
// @access  Private/GroupAdmin
const rejectJoinRequest = asyncHandler(async (req, res) => {
  const group = req.group;
  const userId = req.params.userId;

  await group.removePendingMember(userId);
  res.json({ message: 'Join request rejected' });
});

// @desc    Ban member
// @route   POST /api/groups/:id/ban/:userId
// @access  Private/GroupAdmin
const banMember = asyncHandler(async (req, res) => {
  const { reason, duration } = req.body;
  const userId = req.params.userId;
  const group = req.group;

  // Check if user is an admin or creator
  if (group.admins.includes(userId) || group.createdBy.equals(userId)) {
    res.status(400);
    throw new Error('Cannot ban an admin or group creator');
  }

  await group.banMember(userId, req.user._id, reason, duration);

  // Remove user from group
  const user = await User.findById(userId);
  user.groupId = null;
  await user.save();

  res.json({ message: 'Member banned successfully' });
});

// @desc    Unban member
// @route   POST /api/groups/:id/unban/:userId
// @access  Private/GroupAdmin
const unbanMember = asyncHandler(async (req, res) => {
  const group = req.group;
  const userId = req.params.userId;

  await group.unbanMember(userId);
  res.json({ message: 'Member unbanned successfully' });
});

module.exports = {
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupDetails,
  updateGroup,
  getOnlineMembers,
  generateNewJoinCode,
  approveJoinRequest,
  rejectJoinRequest,
  banMember,
  unbanMember,
};