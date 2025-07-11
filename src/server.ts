import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/database';

// Import routes
import authRoutes from './routes/auth';
import sessionRoutes from './routes/sessions';
import studyMaterialRoutes from './routes/studyMaterials';
import slotRequestRoutes from './routes/slotRequests';
import adminRoutes from './routes/admin';
import whatsappRoutes from './routes/whatsapp';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Connect to MongoDB
connectDB();

// Allow all origins for development
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploads folder statically
app.use('/uploads/study-materials', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' http://localhost:8080 http://localhost:5050"
  );
  next();
});
app.use('/uploads/study-materials', express.static(path.join(__dirname, '../uploads/study-materials')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'EduPortal API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/study-materials', studyMaterialRoutes);
app.use('/api/slot-requests', slotRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
