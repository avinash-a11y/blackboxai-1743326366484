const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      emoji: {
        type: String,
        required: true,
      },
    }],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [{
      content: {
        type: String,
        required: true,
      },
      editedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      links: [{
        url: String,
        title: String,
        description: String,
        image: String,
      }],
      mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

// Add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(
    reaction => reaction.user.equals(userId)
  );

  if (existingReaction) {
    existingReaction.emoji = emoji;
  } else {
    this.reactions.push({ user: userId, emoji });
  }

  return this.save();
};

// Remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => !reaction.user.equals(userId)
  );
  return this.save();
};

// Edit message
messageSchema.methods.edit = function(newContent) {
  // Add current content to edit history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date(),
  });

  // Update content and mark as edited
  this.content = newContent;
  this.isEdited = true;

  return this.save();
};

// Soft delete message
messageSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This message has been deleted';
  this.fileUrl = null;
  this.fileName = null;
  this.fileSize = null;
  this.metadata = {};
  
  return this.save();
};

// Mark as read by user
messageSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.includes(userId)) {
    this.readBy.push(userId);
  }
  return this.save();
};

// Extract metadata (links, mentions) from content
messageSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // Extract URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = this.content.match(urlRegex) || [];
    this.metadata.links = urls.map(url => ({ url }));

    // Extract mentions (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions = this.content.match(mentionRegex) || [];
    this.metadata.mentions = mentions.map(mention => mention.slice(1));
  }
  next();
});

// Virtual for reaction counts
messageSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(reaction => {
    counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
  });
  return counts;
});

// Virtual for read count
messageSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;