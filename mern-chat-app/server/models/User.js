const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    college_domain: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    notifications: [{
      type: {
        type: String,
        enum: ['message', 'group', 'system'],
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      read: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      reference: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'notifications.referenceModel',
      },
      referenceModel: {
        type: String,
        enum: ['Message', 'Group'],
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Match password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Extract college domain from email
userSchema.pre('save', function (next) {
  if (this.isModified('email')) {
    const emailParts = this.email.split('@');
    if (emailParts.length === 2) {
      const domain = emailParts[1];
      if (domain.includes('.edu')) {
        this.college_domain = domain;
      }
    }
  }
  next();
});

// Add notification method
userSchema.methods.addNotification = function (type, message, reference = null, referenceModel = null) {
  this.notifications.push({
    type,
    message,
    reference,
    referenceModel,
  });
  return this.save();
};

// Mark notifications as read
userSchema.methods.markNotificationsAsRead = function () {
  this.notifications.forEach(notification => {
    notification.read = true;
  });
  return this.save();
};

// Get unread notifications count
userSchema.methods.getUnreadNotificationsCount = function () {
  return this.notifications.filter(notification => !notification.read).length;
};

// Clean up old notifications
userSchema.methods.cleanupOldNotifications = function (daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  this.notifications = this.notifications.filter(notification => 
    notification.createdAt > cutoffDate || !notification.read
  );
  
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;