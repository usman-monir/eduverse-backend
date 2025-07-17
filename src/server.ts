import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/database';
import { google, Auth } from 'googleapis';

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import sessionRoutes from './routes/sessions';
import studyMaterialRoutes from './routes/studyMaterials';
import whatsappRoutes from './routes/whatsapp';
import emailRoutes from './routes/email';
import subjectRoutes from './routes/subjects';
import availabeSlotsRoutes from './routes/slots';
// Load environment variables
dotenv.config();

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '5050', 10);

// Connect to MongoDB
connectDB();

// Allow all origins for development
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploads folder statically
app.use('/uploads/study-materials', (req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' http://localhost:8080 http://localhost:5050" //! add production url here
  );
  next();
});
app.use('/uploads/study-materials', express.static(path.join(__dirname, '../uploads/study-materials')));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Score-Smart-LMS API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/study-materials', studyMaterialRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/tutors', availabeSlotsRoutes);

// Google Calendar API setup
const oauth2Client: Auth.OAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
app.post('/api/create-meeting', async (req: Request, res: Response) => {
  const { 
    summary, 
    startTime, 
    endTime, 
    timeZone, 
    localDateTimeString, 
    selectedDate, 
    selectedTime 
  } = req.body;

  if (!summary || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields: summary, startTime, or endTime' });
  }

  const userTimeZone = timeZone || 'Asia/Karachi';

  console.log('Creating meeting with:', {
    summary,
    selectedDate,
    selectedTime,
    localDateTimeString,
    startTime,
    endTime,
    userTimeZone,
    serverTime: new Date().toISOString()
  });

  const event = {
    summary,
    start: { 
      dateTime: startTime, 
      timeZone: userTimeZone 
    },
    end: { 
      dateTime: endTime, 
      timeZone: userTimeZone 
    },
    conferenceData: {
      createRequest: {
        conferenceSolutionKey: { type: 'hangoutsMeet' },
        requestId: `${Date.now()}`,
      },
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });
    
    console.log('Google Calendar event created:', {
      eventId: response.data.id,
      startTime: response.data.start?.dateTime,
      endTime: response.data.end?.dateTime,
      timeZone: response.data.start?.timeZone,
      meetLink: response.data.hangoutLink
    });
    
    return res.json({ 
      meetLink: response.data.hangoutLink,
      eventId: response.data.id,
      startTime: response.data.start?.dateTime,
      endTime: response.data.end?.dateTime
    });
  } catch (error: any) {
    console.error('Error creating meeting:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to create meeting. Please try again.' });
  }
});

app.get('/auth/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('Access Token:', tokens.access_token);
    console.log('Refresh Token:', tokens.refresh_token);

    return res.send('Authentication successful! You can close this tab.');
  } catch (err: any) {
    console.error('Failed to exchange code for tokens:', err.message);
    return res.status(500).send('Authentication failed');
  }
});


// Global error handler
app.use(
  (err: any, req: Request, res: Response, next: NextFunction) => {
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