const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const Group = require('../models/Group');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = req.group.settings.allowedFileTypes;
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: req => req.group.settings.maxFileSize
  },
  fileFilter: fileFilter
});

// @desc    Get messages for a group
// @route   GET /api/chat/messages/:groupId
// @access  Private/GroupMember
const getMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const messages = await Message.find({ group: groupId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('sender', 'username avatar')
    .populate('replyTo')
    .populate('readBy', 'username')
    .populate('reactions.user', 'username');

  const total = await Message.countDocuments({ group: groupId });

  res.json({
    messages: messages.reverse(),
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    total
  });
});

// @desc    Send a new message
// @route   POST /api/chat/messages
// @access  Private/GroupMember
const sendMessage = asyncHandler(async (req, res) => {
  const { content, type = 'text', groupId, replyTo, fileUrl } = req.body;

  const message = await Message.create({
    content,
    type,
    sender: req.user._id,
    group: groupId,
    replyTo,
    fileUrl,
    readBy: [req.user._id]
  });

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'username avatar')
    .populate('replyTo')
    .populate('readBy', 'username');

  res.status(201).json(populatedMessage);
});

// @desc    Upload file
// @route   POST /api/chat/upload
// @access  Private/GroupMember
const uploadFile = asyncHandler(async (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400);
        throw new Error('File size too large');
      }
      res.status(400);
      throw new Error(err.message);
    } else if (err) {
      res.status(400);
      throw new Error(err.message);
    }

    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a file');
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  });
});

// @desc    Delete message
// @route   DELETE /api/chat/messages/:id
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  // Check ownership or admin status
  const group = await Group.findById(message.group);
  if (!message.sender.equals(req.user._id) && !group.admins.includes(req.user._id)) {
    res.status(401);
    throw new Error('Not authorized');
  }

  await message.softDelete();
  res.json({ message: 'Message deleted' });
});

// @desc    Edit message
// @route   PUT /api/chat/messages/:id
// @access  Private
const editMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  // Only sender can edit
  if (!message.sender.equals(req.user._id)) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Can't edit deleted messages
  if (message.isDeleted) {
    res.status(400);
    throw new Error('Cannot edit deleted message');
  }

  await message.edit(req.body.content);

  const updatedMessage = await Message.findById(message._id)
    .populate('sender', 'username avatar')
    .populate('replyTo')
    .populate('readBy', 'username')
    .populate('reactions.user', 'username');

  res.json(updatedMessage);
});

// @desc    React to message
// @route   POST /api/chat/messages/:id/react
// @access  Private/GroupMember
const reactToMessage = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const message = await Message.findById(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  await message.addReaction(req.user._id, emoji);

  const updatedMessage = await Message.findById(message._id)
    .populate('sender', 'username avatar')
    .populate('replyTo')
    .populate('readBy', 'username')
    .populate('reactions.user', 'username');

  res.json(updatedMessage);
});

// @desc    Remove reaction from message
// @route   DELETE /api/chat/messages/:id/react
// @access  Private/GroupMember
const removeReaction = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  await message.removeReaction(req.user._id);

  const updatedMessage = await Message.findById(message._id)
    .populate('sender', 'username avatar')
    .populate('replyTo')
    .populate('readBy', 'username')
    .populate('reactions.user', 'username');

  res.json(updatedMessage);
});

// @desc    Mark messages as read
// @route   POST /api/chat/messages/read
// @access  Private/GroupMember
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { messageIds } = req.body;

  await Message.updateMany(
    {
      _id: { $in: messageIds },
      readBy: { $ne: req.user._id }
    },
    {
      $addToSet: { readBy: req.user._id }
    }
  );

  res.json({ message: 'Messages marked as read' });
});

module.exports = {
  getMessages,
  sendMessage,
  uploadFile,
  deleteMessage,
  editMessage,
  reactToMessage,
  removeReaction,
  markMessagesAsRead,
};