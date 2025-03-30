const mongoose = require('mongoose');
const crypto = require('crypto');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [3, 'Group name must be at least 3 characters long'],
      maxlength: [50, 'Group name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    join_code: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(3).toString('hex').toUpperCase(),
    },
    password: {
      type: String,
      required: [true, 'Group password is required'],
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    college_domain: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    maxMembers: {
      type: Number,
      default: 100,
      min: [2, 'Group must allow at least 2 members'],
      max: [1000, 'Group cannot exceed 1000 members'],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    settings: {
      allowFiles: {
        type: Boolean,
        default: true,
      },
      maxFileSize: {
        type: Number,
        default: 5 * 1024 * 1024, // 5MB
      },
      allowedFileTypes: {
        type: [String],
        default: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      },
      messageRetentionDays: {
        type: Number,
        default: 30,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
    },
    pendingMembers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      requestedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    bannedMembers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      bannedAt: {
        type: Date,
        default: Date.now,
      },
      bannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
      expireAt: Date,
    }],
  },
  {
    timestamps: true,
  }
);

// Generate new join code
groupSchema.methods.generateNewJoinCode = function() {
  this.join_code = crypto.randomBytes(3).toString('hex').toUpperCase();
  return this.save();
};

// Check if group is full
groupSchema.methods.isFull = function() {
  return this.members.length >= this.maxMembers;
};

// Check if user is member
groupSchema.methods.isMember = function(userId) {
  return this.members.includes(userId);
};

// Check if user is admin
groupSchema.methods.isAdmin = function(userId) {
  return this.admins.includes(userId);
};

// Check if user is creator
groupSchema.methods.isCreator = function(userId) {
  return this.createdBy.equals(userId);
};

// Add member
groupSchema.methods.addMember = function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
  }
};

// Remove member
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(id => !id.equals(userId));
  this.admins = this.admins.filter(id => !id.equals(userId));
};

// Ban member
groupSchema.methods.banMember = async function(userId, adminId, reason, duration) {
  this.removeMember(userId);
  
  const banEntry = {
    user: userId,
    bannedBy: adminId,
    reason: reason,
  };

  if (duration) {
    banEntry.expireAt = new Date(Date.now() + duration);
  }

  this.bannedMembers.push(banEntry);
  return this.save();
};

// Unban member
groupSchema.methods.unbanMember = function(userId) {
  this.bannedMembers = this.bannedMembers.filter(ban => !ban.user.equals(userId));
  return this.save();
};

// Check if user is banned
groupSchema.methods.isBanned = function(userId) {
  return this.bannedMembers.some(ban => {
    if (ban.user.equals(userId)) {
      if (ban.expireAt && ban.expireAt < new Date()) {
        // Ban has expired, remove it
        this.bannedMembers = this.bannedMembers.filter(b => !b.user.equals(userId));
        this.save();
        return false;
      }
      return true;
    }
    return false;
  });
};

// Add pending member
groupSchema.methods.addPendingMember = function(userId) {
  if (!this.pendingMembers.some(pm => pm.user.equals(userId))) {
    this.pendingMembers.push({ user: userId });
  }
  return this.save();
};

// Remove pending member
groupSchema.methods.removePendingMember = function(userId) {
  this.pendingMembers = this.pendingMembers.filter(pm => !pm.user.equals(userId));
  return this.save();
};

// Clean up expired bans
groupSchema.methods.cleanupExpiredBans = function() {
  const now = new Date();
  this.bannedMembers = this.bannedMembers.filter(ban => !ban.expireAt || ban.expireAt > now);
  return this.save();
};

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;