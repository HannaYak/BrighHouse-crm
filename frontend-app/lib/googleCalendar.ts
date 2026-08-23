import { google } from 'googleapis';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  calendarId?: string; // Email клинера (его Google-аккаунт)
}

export async function createGoogleCalendarEvent(event: CalendarEventPayload) {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    console.warn('GOOGLE_SERVICE_ACCOUNT_KEY не задан в Environment');
    return { success: false, reason: 'Credentials missing' };
  }

  try {
    const credentials = JSON.parse(serviceAccountJson);

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Если у клинера передан его email — шлем в его календарь, иначе в primary
    const targetCalendarId = event.calendarId || 'primary';

    const response = await calendar.events.insert({
      calendarId: targetCalendarId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.startDateTime,
          timeZone: 'Europe/Warsaw',
        },
        end: {
          dateTime: event.endDateTime,
          timeZone: 'Europe/Warsaw',
        },
      },
    });

    return { success: true, eventId: response.data.id };
  } catch (error) {
    console.error('Ошибка записи в Google Calendar:', error);
    return { success: false, error };
  }
}
