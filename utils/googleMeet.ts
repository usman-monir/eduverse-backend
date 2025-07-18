// utils/googleMeet.ts
import { google ,Auth} from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

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

export async function generateGoogleMeetLink(summary: string, startTime: string, endTime: string, timeZone = 'Asia/Karachi') {
  const event = {
    summary,
    start: { dateTime: startTime, timeZone },
    end: { dateTime: endTime, timeZone },
    conferenceData: {
      createRequest: {
        conferenceSolutionKey: { type: 'hangoutsMeet' },
        requestId: `${Date.now()}`,
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
  });

  return {
    meetLink: response.data.hangoutLink,
    eventId: response.data.id,
    startTime: response.data.start?.dateTime,
    endTime: response.data.end?.dateTime,
  };
}
