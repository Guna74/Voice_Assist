const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');

router.post('/signup', 
  body('email').isEmail(), 
  body('password').isLength({ min: 6 }),
  authController.signup
);

router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/me', authController.getProfile);

module.exports = router;
