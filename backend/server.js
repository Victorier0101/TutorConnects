const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database connection with promise support
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Promisify database queries
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(uploadsDir, 'images');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session is still valid
    const sessionCheck = await query(
      'SELECT * FROM user_sessions WHERE user_id = ? AND session_token = ? AND expires_at > NOW()',
      [decoded.userId, token]
    );

    if (sessionCheck.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Get user info
    const user = await query('SELECT * FROM users WHERE id = ? AND is_active = TRUE', [decoded.userId]);
    if (user.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Spam prevention middleware
const checkPostLimits = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Get or create user post limits
    let limits = await query('SELECT * FROM user_post_limits WHERE user_id = ?', [userId]);
    
    if (limits.length === 0) {
      await query(
        'INSERT INTO user_post_limits (user_id, last_reset_date) VALUES (?, ?)',
        [userId, today]
      );
      limits = await query('SELECT * FROM user_post_limits WHERE user_id = ?', [userId]);
    }

    const userLimits = limits[0];
    
    // Reset counters if it's a new day/week/month
    const lastReset = new Date(userLimits.last_reset_date);
    const todayDate = new Date(today);
    
    if (lastReset < todayDate) {
      const daysDiff = Math.floor((todayDate - lastReset) / (1000 * 60 * 60 * 24));
      
      let resetData = {};
      if (daysDiff >= 1) resetData.posts_today = 0;
      if (daysDiff >= 7) resetData.posts_this_week = 0;
      if (daysDiff >= 30) resetData.posts_this_month = 0;
      
      if (Object.keys(resetData).length > 0) {
        resetData.last_reset_date = today;
        const setClause = Object.keys(resetData).map(key => `${key} = ?`).join(', ');
        const values = Object.values(resetData);
        
        await query(
          `UPDATE user_post_limits SET ${setClause} WHERE user_id = ?`,
          [...values, userId]
        );
        
        // Refresh limits
        limits = await query('SELECT * FROM user_post_limits WHERE user_id = ?', [userId]);
        userLimits = limits[0];
      }
    }

    // Check limits (configurable)
    const DAILY_LIMIT = 5;
    const WEEKLY_LIMIT = 20;
    const MONTHLY_LIMIT = 50;

    if (userLimits.posts_today >= DAILY_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily posting limit reached. Please try again tomorrow.',
        limits: { daily: DAILY_LIMIT, weekly: WEEKLY_LIMIT, monthly: MONTHLY_LIMIT },
        current: { today: userLimits.posts_today, week: userLimits.posts_this_week, month: userLimits.posts_this_month }
      });
    }

    if (userLimits.posts_this_week >= WEEKLY_LIMIT) {
      return res.status(429).json({ 
        error: 'Weekly posting limit reached. Please try again next week.',
        limits: { daily: DAILY_LIMIT, weekly: WEEKLY_LIMIT, monthly: MONTHLY_LIMIT },
        current: { today: userLimits.posts_today, week: userLimits.posts_this_week, month: userLimits.posts_this_month }
      });
    }

    if (userLimits.posts_this_month >= MONTHLY_LIMIT) {
      return res.status(429).json({ 
        error: 'Monthly posting limit reached. Please try again next month.',
        limits: { daily: DAILY_LIMIT, weekly: WEEKLY_LIMIT, monthly: MONTHLY_LIMIT },
        current: { today: userLimits.posts_today, week: userLimits.posts_this_week, month: userLimits.posts_this_month }
      });
    }

    req.userLimits = userLimits;
    next();
  } catch (error) {
    console.error('Error checking post limits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============= AUTHENTICATION ROUTES =============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const result = await query(
      'INSERT INTO users (name, email, password_hash, verification_token) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, verificationToken]
    );

    const userId = result.insertId;

    // Create user profile
    await query('INSERT INTO user_profiles (user_id) VALUES (?)', [userId]);

    // Create session
    const sessionToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      'INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [userId, sessionToken, expiresAt, req.ip, req.get('User-Agent')]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: userId, name, email, email_verified: false },
      token: sessionToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const users = await query('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Create session
    const sessionToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [user.id, sessionToken, expiresAt, req.ip, req.get('User-Agent')]
    );

    // Get user profile
    const profiles = await query('SELECT * FROM user_profiles WHERE user_id = ?', [user.id]);
    const profile = profiles[0] || {};

    res.json({ 
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        avatar_url: user.avatar_url,
        profile
      },
      token: sessionToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    await query('DELETE FROM user_sessions WHERE session_token = ?', [token]);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const profiles = await query('SELECT * FROM user_profiles WHERE user_id = ?', [req.user.id]);
    const profile = profiles[0] || {};

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        email_verified: req.user.email_verified,
        avatar_url: req.user.avatar_url,
        profile
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= FILE UPLOAD ROUTES =============

// Image upload endpoint
app.post('/api/upload/image', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get the file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`;
    
    res.json({ 
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= POSTS ROUTES =============

// Get all posts with user information
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await query(`
      SELECT 
        p.*,
        u.name,
        u.email,
        u.avatar_url,
        p.contact_email,
        p.contact_phone,
        up.rating,
        up.total_reviews
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE p.is_active = TRUE AND u.is_active = TRUE
      ORDER BY p.created_at DESC
    `);

    // Parse JSON fields for each post
    const processedPosts = posts.map(post => ({
      ...post,
      image_urls: post.image_urls ? JSON.parse(post.image_urls) : []
    }));

    res.json(processedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Filter posts
app.get('/api/posts/filter/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    let whereClause = 'WHERE p.is_active = TRUE AND u.is_active = TRUE';
    let params = [];
    
    if (type !== 'all') {
      whereClause += ' AND p.post_type = ?';
      params.push(type);
    }

    const posts = await query(`
      SELECT 
        p.*,
        u.name,
        u.email,
        u.avatar_url,
        p.contact_email,
        p.contact_phone,
        up.rating,
        up.total_reviews
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ${whereClause}
      ORDER BY p.created_at DESC
    `, params);

    // Parse JSON fields for each post
    const processedPosts = posts.map(post => ({
      ...post,
      image_urls: post.image_urls ? JSON.parse(post.image_urls) : []
    }));

    res.json(processedPosts);
  } catch (error) {
    console.error('Error filtering posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const posts = await query(`
      SELECT 
        p.*,
        u.name,
        u.email,
        u.avatar_url,
        p.contact_email,
        p.contact_phone,
        up.rating,
        up.total_reviews,
        up.bio,
        up.education,
        up.experience
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE p.id = ? AND p.is_active = TRUE AND u.is_active = TRUE
    `, [id]);

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Parse JSON fields
    const post = {
      ...posts[0],
      image_urls: posts[0].image_urls ? JSON.parse(posts[0].image_urls) : []
    };

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new post (requires authentication and spam check)
app.post('/api/posts', authenticateToken, checkPostLimits, async (req, res) => {
  try {
    const { 
      post_type, 
      subject, 
      level, 
      location, 
      latitude, 
      longitude, 
      location_confidence, 
      location_source,
      format, 
      description, 
      contact_email, 
      contact_phone, 
      expires_at, 
      image_urls 
    } = req.body;

    // If format is online, location can be optional
    if ((format && format.toLowerCase() === 'online') && !location) {
      // Default location to 'Online'
      req.body.location = 'Online';
    }

    // Validation
    if (!post_type || !subject || !level || !format || !description) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Validate and process image URLs
    let processedImageUrls = null;
    if (image_urls && Array.isArray(image_urls) && image_urls.length > 0) {
      // Filter out empty URLs and limit to 5 images
      const validUrls = image_urls.filter(url => url && typeof url === 'string').slice(0, 5);
      if (validUrls.length > 0) {
        processedImageUrls = JSON.stringify(validUrls);
      }
    }

    // Create post with enhanced location data
    const result = await query(
      'INSERT INTO posts (user_id, post_type, subject, level, location, latitude, longitude, location_confidence, location_source, format, description, image_urls, contact_email, contact_phone, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.id, 
        post_type, 
        subject, 
        level, 
        location || 'Online', 
        latitude || null,
        longitude || null,
        location_confidence || null,
        location_source || null,
        format, 
        description, 
        processedImageUrls, 
        contact_email || null, 
        contact_phone || null, 
        expires_at || null
      ]
    );

    // Update post limits
    await query(`
      UPDATE user_post_limits 
      SET posts_today = posts_today + 1,
          posts_this_week = posts_this_week + 1,
          posts_this_month = posts_this_month + 1,
          last_post_date = CURDATE()
      WHERE user_id = ?
    `, [req.user.id]);

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Post created successfully',
      remaining_limits: {
        today: 5 - (req.userLimits.posts_today + 1),
        week: 20 - (req.userLimits.posts_this_week + 1),
        month: 50 - (req.userLimits.posts_this_month + 1)
      }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update post (only by owner)
app.put('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, level, location, format, description, contact_email, contact_phone, is_active } = req.body;

    // Check if user owns the post
    const posts = await query('SELECT * FROM posts WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found or you do not have permission to edit it' });
    }

    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (level !== undefined) updateData.level = level;
    if (location !== undefined) updateData.location = location;
    if (format !== undefined) updateData.format = format;
    if (description !== undefined) updateData.description = description;
    if (contact_email !== undefined) updateData.contact_email = contact_email;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);

    await query(`UPDATE posts SET ${setClause} WHERE id = ?`, [...values, id]);

    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete post (only by owner)
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the post
    const posts = await query('SELECT * FROM posts WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found or you do not have permission to delete it' });
    }

    await query('UPDATE posts SET is_active = FALSE WHERE id = ?', [id]);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= MESSAGING ROUTES =============

// Get user's conversations
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await query(`
      SELECT 
        c.*,
        u1.name as participant1_name,
        u1.avatar_url as participant1_avatar,
        u2.name as participant2_name,
        u2.avatar_url as participant2_avatar,
        p.subject as post_subject,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = FALSE) as unread_count
      FROM conversations c
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE c.participant1_id = ? OR c.participant2_id = ?
      ORDER BY c.last_message_at DESC
    `, [req.user.id, req.user.id, req.user.id]);

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start or get conversation
app.post('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const { participant_id, post_id } = req.body;

    if (!participant_id) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    if (participant_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    // Check if conversation already exists
    const existingConversation = await query(`
      SELECT * FROM conversations 
      WHERE (participant1_id = ? AND participant2_id = ?) 
         OR (participant1_id = ? AND participant2_id = ?)
    `, [req.user.id, participant_id, participant_id, req.user.id]);

    if (existingConversation.length > 0) {
      return res.json({ conversation_id: existingConversation[0].id });
    }

    // Create new conversation
    const result = await query(
      'INSERT INTO conversations (participant1_id, participant2_id, post_id) VALUES (?, ?, ?)',
      [Math.min(req.user.id, participant_id), Math.max(req.user.id, participant_id), post_id || null]
    );

    res.status(201).json({ conversation_id: result.insertId });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages in a conversation
app.get('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is participant in conversation
    const conversation = await query(
      'SELECT * FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [id, req.user.id, req.user.id]
    );

    if (conversation.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const offset = (page - 1) * limit;
    const messages = await query(`
      SELECT 
        m.*,
        u.name as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit), offset]);

    // Mark messages as read
    await query(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ?',
      [id, req.user.id]
    );

    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message
app.post('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, message_type = 'text', file_url } = req.body;

    if (!content && !file_url) {
      return res.status(400).json({ error: 'Message content or file URL is required' });
    }

    // Check if user is participant in conversation
    const conversation = await query(
      'SELECT * FROM conversations WHERE id = ? AND (participant1_id = ? OR participant2_id = ?)',
      [id, req.user.id, req.user.id]
    );

    if (conversation.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Send message
    const result = await query(
      'INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.id, content || '', message_type, file_url || null]
    );

    // Get the created message with sender info
    const message = await query(`
      SELECT 
        m.*,
        u.name as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [result.insertId]);

    res.status(201).json(message[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= REVIEWS ROUTES =============

// Get reviews for a user
app.get('/api/users/:userId/reviews', async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await query(`
      SELECT 
        r.*,
        u.name as reviewer_name,
        u.avatar_url as reviewer_avatar,
        p.subject as post_subject
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN posts p ON r.post_id = p.id
      WHERE r.reviewed_user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create review
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { reviewed_user_id, post_id, rating, comment } = req.body;

    if (!reviewed_user_id || !rating) {
      return res.status(400).json({ error: 'Reviewed user ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (reviewed_user_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }

    // Check if review already exists
    const existingReview = await query(
      'SELECT id FROM reviews WHERE reviewer_id = ? AND reviewed_user_id = ? AND post_id = ?',
      [req.user.id, reviewed_user_id, post_id || null]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this user for this post' });
    }

    // Create review
    await query(
      'INSERT INTO reviews (reviewer_id, reviewed_user_id, post_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, reviewed_user_id, post_id || null, rating, comment || null]
    );

    res.status(201).json({ message: 'Review created successfully' });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= NOTIFICATIONS ROUTES =============

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= UTILITY ROUTES =============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get user's post limits
app.get('/api/user/limits', authenticateToken, async (req, res) => {
  try {
    const limits = await query('SELECT * FROM user_post_limits WHERE user_id = ?', [req.user.id]);
    
    if (limits.length === 0) {
      return res.json({
        posts_today: 0,
        posts_this_week: 0,
        posts_this_month: 0,
        limits: { daily: 5, weekly: 20, monthly: 50 }
      });
    }

    const userLimits = limits[0];
    res.json({
      posts_today: userLimits.posts_today,
      posts_this_week: userLimits.posts_this_week,
      posts_this_month: userLimits.posts_this_month,
      limits: { daily: 5, weekly: 20, monthly: 50 },
      remaining: {
        today: Math.max(0, 5 - userLimits.posts_today),
        week: Math.max(0, 20 - userLimits.posts_this_week),
        month: Math.max(0, 50 - userLimits.posts_this_month)
      }
    });
  } catch (error) {
    console.error('Error fetching user limits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= ENHANCED GEOCODING ROUTES =============

// Enhanced Geocoding endpoint with multiple sources and North American focus
app.get('/api/geocode', async (req, res) => {
  const { location } = req.query;
  
  if (!location) {
    return res.status(400).json({ error: 'Location parameter is required' });
  }

  try {
    console.log(`🌍 Enhanced geocoding request for: ${location}`);
    
    const result = await enhancedGeocode(location);
    
    if (result) {
      console.log(`🌍 Successfully geocoded ${location} using ${result.source} with ${result.confidence} confidence`);
      res.json([{
        lat: result.lat.toString(),
        lon: result.lon.toString(),
        display_name: result.display_name,
        confidence: result.confidence,
        source: result.source,
        country: result.country,
        city: result.city,
        state: result.state,
        type: 'geocoded'
      }]);
    } else {
      console.log(`🌍 No results found for ${location} across all geocoding sources`);
      res.json([]);
    }
  } catch (error) {
    console.error(`🌍 Geocoding error for ${location}:`, error.message);
    res.status(500).json({ error: 'Geocoding failed', details: error.message });
  }
});

// Location validation endpoint for real-time validation
app.get('/api/validate-location', async (req, res) => {
  const { location } = req.query;
  
  if (!location) {
    return res.status(400).json({ error: 'Location parameter is required' });
  }

  try {
    console.log(`📍 Location validation request for: ${location}`);
    
    const result = await enhancedGeocode(location);
    
    if (result) {
      res.json({
        valid: true,
        location: {
          address: location,
          coordinates: [result.lat, result.lon],
          confidence: result.confidence,
          source: result.source,
          displayName: result.display_name,
          country: result.country,
          city: result.city,
          state: result.state
        }
      });
    } else {
      res.json({
        valid: false,
        suggestions: generateLocationSuggestions(location)
      });
    }
  } catch (error) {
    console.error('Location validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Enhanced geocoding function with multiple sources cascade
async function enhancedGeocode(location) {
  // Define geocoding sources in order of preference
  const geocoders = [
    () => tryNominatim(location),
    () => tryPhoton(location),
    () => tryMapBox(location), // Better North American coverage
  ];

  for (let i = 0; i < geocoders.length; i++) {
    const geocoder = geocoders[i];
    const sourceName = ['Nominatim', 'Photon', 'MapBox'][i];
    
    try {
      console.log(`🔍 Trying ${sourceName} for: ${location}`);
      const result = await geocoder();
      if (result) {
        console.log(`✅ ${sourceName} found result for: ${location}`);
        return result;
      } else {
        console.log(`❌ ${sourceName} found no results for: ${location}`);
      }
    } catch (error) {
      console.log(`💥 ${sourceName} failed for ${location}:`, error.message);
      continue;
    }
  }

  console.log(`🚫 All geocoding sources failed for: ${location}`);
  return null;
}

// Nominatim (OpenStreetMap) geocoding - Free, good global coverage
async function tryNominatim(location) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&q=${encodeURIComponent(location)}&limit=5&` +
      `countrycodes=ca,us&accept-language=en&addressdetails=1&` +
      `bounded=0&dedupe=1`,
      {
        headers: {
          'User-Agent': 'TutorConnect/1.0 (contact@tutorconnect.com)',
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data || data.length === 0) return null;

    // Find best match based on location type and importance
    const bestResult = findBestNominatimResult(data, location);
    
    return {
      lat: parseFloat(bestResult.lat),
      lon: parseFloat(bestResult.lon),
      display_name: bestResult.display_name,
      confidence: calculateNominatimConfidence(bestResult, location),
      source: 'nominatim',
      country: bestResult.address?.country || '',
      city: bestResult.address?.city || bestResult.address?.town || bestResult.address?.village || '',
      state: bestResult.address?.state || bestResult.address?.province || '',
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Photon (Komoot) geocoding - Better European/Canadian coverage
async function tryPhoton(location) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(location)}&limit=5&lang=en`,
      {
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data?.features || data.features.length === 0) return null;

    const result = data.features[0];
    const coords = result.geometry.coordinates;
    
    return {
      lat: coords[1], // Photon returns [lon, lat]
      lon: coords[0],
      display_name: formatPhotonDisplayName(result.properties),
      confidence: calculatePhotonConfidence(result, location),
      source: 'photon',
      country: result.properties.country || '',
      city: result.properties.city || '',
      state: result.properties.state || '',
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// MapBox geocoding (using their free tier) - Excellent North American coverage
async function tryMapBox(location) {
  // For now, return null - can be enabled with API key
  // This would provide the best North American coverage
  // const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
  // if (!MAPBOX_TOKEN) return null;
  
  // Example implementation:
  /*
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?` +
      `access_token=${MAPBOX_TOKEN}&country=us,ca&limit=5&types=address,poi,place`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data?.features || data.features.length === 0) return null;

    const result = data.features[0];
    
    return {
      lat: result.center[1],
      lon: result.center[0],
      display_name: result.place_name,
      confidence: 'high',
      source: 'mapbox',
      country: extractMapBoxProperty(result, 'country'),
      city: extractMapBoxProperty(result, 'place'),
      state: extractMapBoxProperty(result, 'region'),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
  */
  
  return null;
}

// Helper function to find the best Nominatim result
function findBestNominatimResult(results, originalLocation) {
  const locationLower = originalLocation.toLowerCase();
  
  // Prioritize results by type and relevance
  const typeScores = {
    'city': 10,
    'town': 9,
    'village': 8,
    'suburb': 7,
    'neighbourhood': 6,
    'hamlet': 5,
    'administrative': 4,
    'house': 3,
    'building': 2,
    'amenity': 1
  };

  let bestResult = results[0];
  let bestScore = 0;

  for (const result of results) {
    let score = 0;
    
    // Score based on type
    const type = result.type || result.class || '';
    score += typeScores[type] || 0;
    
    // Score based on importance
    if (result.importance) {
      score += result.importance * 10;
    }
    
    // Score based on how well it matches the input
    if (result.display_name.toLowerCase().includes(locationLower)) {
      score += 5;
    }
    
    // Prefer Canadian/US results
    const country = result.address?.country?.toLowerCase() || '';
    if (country.includes('canada') || country.includes('united states')) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }

  return bestResult;
}

// Calculate confidence for Nominatim results
function calculateNominatimConfidence(result, originalLocation) {
  const locationLower = originalLocation.toLowerCase();
  const displayLower = result.display_name?.toLowerCase() || '';
  
  // High confidence for exact matches, postal codes, or high importance
  if (displayLower.includes(locationLower) || 
      /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(originalLocation) ||
      (result.importance && result.importance > 0.7)) {
    return 'high';
  }
  
  // Medium confidence for partial matches or medium importance
  if (result.address && (
      locationLower.includes(result.address.city?.toLowerCase()) ||
      locationLower.includes(result.address.town?.toLowerCase()) ||
      locationLower.includes(result.address.state?.toLowerCase()) ||
      (result.importance && result.importance > 0.4)
  )) {
    return 'medium';
  }
  
  return 'low';
}

// Calculate confidence for Photon results
function calculatePhotonConfidence(result, originalLocation) {
  const properties = result.properties;
  const locationLower = originalLocation.toLowerCase();
  
  if (properties.name?.toLowerCase().includes(locationLower) ||
      locationLower.includes(properties.name?.toLowerCase()) ||
      properties.osm_key === 'place') {
    return 'high';
  }
  
  if (properties.city?.toLowerCase().includes(locationLower) ||
      properties.state?.toLowerCase().includes(locationLower) ||
      properties.street?.toLowerCase().includes(locationLower)) {
    return 'medium';
  }
  
  return 'low';
}

// Format Photon display name
function formatPhotonDisplayName(properties) {
  const parts = [];
  
  if (properties.name) parts.push(properties.name);
  if (properties.street) parts.push(properties.street);
  if (properties.city) parts.push(properties.city);
  if (properties.state) parts.push(properties.state);
  if (properties.country) parts.push(properties.country);
  
  return parts.join(', ') || 'Unknown Location';
}

// Generate helpful suggestions for invalid locations
function generateLocationSuggestions(location) {
  const suggestions = [
    'Try including province/state (e.g., "Vancouver, BC" or "Seattle, WA")',
    'Use full address (e.g., "123 Main St, Toronto, ON")',
    'Include postal/zip code (e.g., "M5V 3L9" or "90210")',
    'Try neighborhood name (e.g., "Downtown Toronto")',
    'Check spelling of city/region name'
  ];

  // Add location-specific suggestions
  const locationLower = location.toLowerCase();
  
  if (locationLower.includes('canada') || locationLower.includes('canadian')) {
    suggestions.unshift('For Canadian locations, include province (e.g., "Calgary, AB")');
  }
  
  if (locationLower.includes('us') || locationLower.includes('america')) {
    suggestions.unshift('For US locations, include state (e.g., "Austin, TX")');
  }

  return suggestions;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 