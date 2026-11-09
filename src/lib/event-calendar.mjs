/** @typedef {{ calendarId?: string, datetime: string, title: string, description: string, status: string, location?: string, endDatetime?: string }} CalendarEvent */

const zonedDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
const validTime = (value) => zonedDateTime.test(value) && Number.isFinite(Date.parse(value));

/** Only explicitly enabled, scheduled events get downloads. @param {CalendarEvent} event */
export function hasCalendarDownload(event) {
  return Boolean(event.calendarId && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.calendarId) && validTime(event.datetime));
}

export function escapeCalendarText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

// Fold on UTF-8 byte boundaries, without splitting a Unicode character.
export function foldCalendarLine(value) {
  let line = '';
  let bytes = 0;
  const lines = [];
  for (const character of value) {
    const length = new TextEncoder().encode(character).length;
    if (bytes + length > 75) {
      lines.push(line);
      line = ' ';
      bytes = 1;
    }
    line += character;
    bytes += length;
  }
  return [...lines, line].join('\r\n');
}

const utc = (value) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** @param {CalendarEvent} event */
export function createEventCalendar(event, now = new Date()) {
  if (!hasCalendarDownload(event)) throw new Error('Calendar downloads require a stable ID and a start time with a time zone.');
  if (event.endDatetime && (!validTime(event.endDatetime) || Date.parse(event.endDatetime) <= Date.parse(event.datetime))) {
    throw new Error('Event end must be a valid time after the start.');
  }
  const description = [event.description, event.status, !event.endDatetime ? 'End time not provided; adjust the duration in your calendar.' : ''].filter(Boolean).join('\n\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//S3S//Events//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${event.calendarId}@s3s-events`, `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(event.datetime)}`,
    ...(event.endDatetime ? [`DTEND:${utc(event.endDatetime)}`] : []),
    `SUMMARY:${escapeCalendarText(event.title)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    ...(event.location ? [`LOCATION:${escapeCalendarText(event.location)}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
}
