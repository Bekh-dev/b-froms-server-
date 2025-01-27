const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'https://bekh-dev.github.io'
];

console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    console.log('Request origin:', origin);
    
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      console.log('CORS blocked:', origin);
      return callback(new Error(msg), false);
    }
    console.log('CORS allowed:', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Error handling for MongoDB connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connection restored');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
const authRoutes = require('./routes/auth');
const templateRoutes = require('./routes/templates');
const salesforceRoutes = require('./routes/salesforce');
const responsesRoutes = require('./routes/responses');
const jiraRoutes = require('./routes/jiraRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/salesforce', salesforceRoutes);
app.use('/api/responses', responsesRoutes);
app.use('/api/jira', jiraRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: err.message || 'Something broke!',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Keep alive
let isConnected = false;
setInterval(async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      if (!isConnected) {
        console.log('MongoDB connection restored');
        isConnected = true;
      }
    } else {
      isConnected = false;
      console.log('MongoDB disconnected. Attempting to reconnect...');
      await mongoose.connect(process.env.MONGODB_URI);
    }
  } catch (err) {
    isConnected = false;
    console.error('MongoDB ping error:', err);
  }
}, 30000);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('CORS origin:', process.env.CLIENT_URL || 'http://localhost:3000');
  console.log('MongoDB connected');
});

// Handle server shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
