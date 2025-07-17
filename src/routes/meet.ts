// backend/routes/googleAuth.ts
import express, { Request, Response } from 'express';
import { google, Auth } from 'googleapis';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';

const router = express.Router();

const oauth2Client: Auth.OAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Generate Google OAuth URL for tutors
router.get('/google/auth-url/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        console.log("Received request to generate auth URL for userId:", userId);

        const user = await User.findById(userId);
        if (!user || user.role !== 'tutor') {
            console.log("Invalid user or not a tutor:", user);
            return res.status(400).json({ error: 'Invalid user or not a tutor' });
        }

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar'],
            state: userId,
            prompt: 'consent'
        });

        console.log("Generated authUrl:", authUrl);
        res.json({ authUrl });

    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: 'Failed to generate auth URL' });
    }
    return;
});

// Handle Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
        return res.status(400).send(`
            <html>
              <body>
                <h2>❌ Authentication Failed</h2>
                <p>Missing authorization code or user ID.</p>
                <button onclick="window.close()">Close Window</button>
              </body>
            </html>
        `);
    }

    try {
        // Temporarily create a new OAuth2 client instance
        const tempOAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_CALLBACK_URL
        );

        // Exchange the code for tokens
        const { tokens } = await tempOAuth2Client.getToken(code as string);
        tempOAuth2Client.setCredentials(tokens);

        // Ensure refresh token exists
        if (!tokens.refresh_token) {
            return res.status(400).send(`
              <html>
                <body>
                  <h2>⚠️ Authentication Incomplete</h2>
                  <p>This account has already granted access previously.</p>
                  <p>Please remove access in your Google account or use a different account.</p>
                  <button onclick="window.close()">Close Window</button>
                </body>
              </html>
            `);
        }

        // Listen for new tokens and store refresh_token if returned
        tempOAuth2Client.on('tokens', async (newTokens) => {
            if (newTokens.refresh_token) {
                await User.findByIdAndUpdate(userId, {
                    googleRefreshToken: newTokens.refresh_token
                });
            }
        });

        // Get user info from Google
        const oauth2 = google.oauth2({ version: 'v2', auth: tempOAuth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Save token and email to DB
        await User.findByIdAndUpdate(userId, {
            googleRefreshToken: tokens.refresh_token,
            googleEmail: userInfo.data.email,
            googleConnected: true
        });

        console.log(`✅ Google account connected for user ${userId}: ${userInfo.data.email}`);

        // Success HTML Response
        res.send(`
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #4CAF50; }
                .info { color: #2196F3; }
                button { padding: 10px 20px; margin: 10px; cursor: pointer; }
              </style>
            </head>
            <body>
              <h2 class="success">✅ Google Calendar Connected Successfully!</h2>
              <p class="info">Connected account: <strong>${userInfo.data.email}</strong></p>
              <p>You can now create Google Meet sessions as the organizer.</p>
              <button onclick="window.close()">Close Window</button>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);

    } catch (error: any) {
        console.error('❌ Error in Google callback:', error);

        res.status(500).send(`
            <html>
              <body>
                <h2>❌ Authentication Failed</h2>
                <p>Error: ${error.message}</p>
                <button onclick="window.close()">Close Window</button>
              </body>
            </html>
        `);
    }
    return;
});

// Check Google connection status
router.get('/google/status/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('googleRefreshToken googleEmail googleConnected');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            connected: !!user.googleRefreshToken,
            googleEmail: user.googleEmail || null
        });

    } catch (error) {
        console.error('Error checking Google status:', error);
        res.status(500).json({ error: 'Failed to check Google connection status' });
    }

    return;
});

// Disconnect Google account
router.post('/google/disconnect/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        await User.findByIdAndUpdate(userId, {
            $unset: {
                googleRefreshToken: 1,
                googleEmail: 1,
                googleConnected: 1
            }
        });

        res.json({ message: 'Google account disconnected successfully' });
    } catch (error) {
        console.error('Error disconnecting Google account:', error);
        res.status(500).json({ error: 'Failed to disconnect Google account' });
    }
});

// Create meeting with tutor as organizer
router.post('/create-meeting', async (req: Request, res: Response) => {
    const {
        summary,
        startTime,
        endTime,
        timeZone,
        tutorId,
        localDateTimeString,
        selectedDate,
        selectedTime
    } = req.body;

    if (!summary || !startTime || !endTime || !tutorId) {
        return res.status(400).json({
            error: 'Missing required fields: summary, startTime, endTime, or tutorId'
        });
    }

    try {
        // Get tutor's Google refresh token
        const tutor = await User.findById(tutorId).select('googleRefreshToken name email');

        if (!tutor) {
            return res.status(404).json({ error: 'Tutor not found' });
        }

        if (!tutor.googleRefreshToken) {
            return res.status(400).json({
                error: 'Tutor has not connected their Google account',
                requiresAuth: true,
                tutorName: tutor.name
            });
        }

        // Create OAuth client with tutor's credentials
        const tutorOAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_CALLBACK_URL
        );

        tutorOAuth2Client.setCredentials({
            refresh_token: tutor.googleRefreshToken,
        });

        const tutorCalendar = google.calendar({ version: 'v3', auth: tutorOAuth2Client });
        const userTimeZone = timeZone || 'Asia/Karachi';

        console.log('Creating meeting with tutor as organizer:', {
            tutorName: tutor.name,
            tutorEmail: tutor.email,
            summary,
            selectedDate,
            selectedTime,
            startTime,
            endTime,
            userTimeZone
        });

        const event = {
            summary,
            description: `Tutoring session created through the platform.`,
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
                    requestId: `tutor-${tutorId}-${Date.now()}`,
                },
            },
        };

        const response = await tutorCalendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1,
        });

        console.log('Google Calendar event created by tutor:', {
            eventId: response.data.id,
            organizer: response.data.organizer?.email,
            startTime: response.data.start?.dateTime,
            endTime: response.data.end?.dateTime,
            meetLink: response.data.hangoutLink
        });

        return res.json({
            meetLink: response.data.hangoutLink,
            eventId: response.data.id,
            startTime: response.data.start?.dateTime,
            endTime: response.data.end?.dateTime,
            organizer: response.data.organizer?.email
        });
    } catch (error: any) {
        console.error('Error creating meeting:', error);

        if (error.message?.includes('invalid_grant')) {
            return res.status(401).json({
                error: 'Google authentication expired. Please reconnect your Google account.',
                requiresReauth: true
            });
        }

        return res.status(500).json({
            error: 'Failed to create meeting. Please try again.',
            details: error.message
        });
    }
});

export default router;