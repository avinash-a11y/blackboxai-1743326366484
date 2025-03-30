const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  checkUsername,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/check-username/:username', checkUsername);

// Protected routes
router.use(protect); // Apply protection middleware to all routes below
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.post('/logout', logoutUser);

module.exports = router;