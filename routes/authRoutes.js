const express = require('express');
const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token: 'jwt-token-' + Date.now(),
    user: {
      id: 'user-id-' + Date.now(),
      email,
      firstName,
      lastName,
      createdAt: new Date().toISOString()
    }
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simulate user verification
  if (email === 'test@example.com' && password === 'password123') {
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: 'valid-jwt-token-' + Date.now(),
      user: {
        id: 'existing-user-id',
        email,
        firstName: 'Test',
        lastName: 'User'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// GET /api/auth/profile (protected route example)
router.get('/profile', (req, res) => {
  // In real app, this would verify JWT token
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
  
  res.status(200).json({
    success: true,
    message: 'Auth profile fetched successfully',
    user: {
      id: 'authenticated-user',
      email: 'test@example.com',
      firstName: 'Authenticated',
      lastName: 'User',
      role: 'user'
    }
  });
});

module.exports = router;