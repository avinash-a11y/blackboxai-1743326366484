const express = require('express');
const router = express.Router();
const {
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupDetails,
  updateGroup,
  getOnlineMembers,
  generateNewJoinCode,
} = require('../controllers/groupController');
const { protect, groupMember } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Group creation and joining
router.post('/', createGroup);
router.post('/join', joinGroup);
router.post('/leave', leaveGroup);

// Group management
router.get('/:id', groupMember, getGroupDetails);
router.put('/:id', groupMember, updateGroup);
router.get('/:id/online', groupMember, getOnlineMembers);
router.post('/:id/new-code', groupMember, generateNewJoinCode);

module.exports = router;