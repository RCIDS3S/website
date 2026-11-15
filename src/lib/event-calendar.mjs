import { easternDateKey } from './calendar-month.mjs';

/** @typedef {{ calendarId?: string, datetime: string, title: string, description: string, status: string, location?: string, endDatetime?: string, endDate?: string, host?: string, url?: string, banner?: string, bannerEndDate?: string }} CalendarEvent */
const zonedDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
const validTime = (value) => zonedDateTime.test(value) && Number.isFinite(Date.parse(value));
export const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;

/** @param {CalendarEvent} event */
export function hasCalendarDownload(event) {
  return Boolean(event.calendarId && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.calendarId) && (validTime(event.datetime) || isDateOnly(event.datetime)));
}
/** @param {CalendarEvent} event */
export const eventStartDay = (event) => isDateOnly(event.datetime) ? event.datetime : easternDateKey(event.datetime);
/** @param {CalendarEvent} event */
export const eventEndDay = (event) => isDateOnly(event.datetime) ? event.endDate || event.datetime : eventStartDay(event);
/** @param {CalendarEvent} a @param {CalendarEvent} b */
export function compareEventStarts(a,b) {
  return eventStartDay(a).localeCompare(eventStartDay(b)) || Number(!isDateOnly(a.datetime))-Number(!isDateOnly(b.datetime)) || Date.parse(a.datetime)-Date.parse(b.datetime);
}
/** Banner duration is independent of calendar event duration. @param {CalendarEvent} event */
export const bannerEndDay = (event) => event.bannerEndDate || event.endDate;
/** @param {CalendarEvent[]} events */
export function activePeriods(events, now = Date.now()) {
  const today = easternDateKey(now);
  return events.filter(event => hasCalendarDownload(event) && isDateOnly(event.datetime) && isDateOnly(bannerEndDay(event)) && event.datetime <= today && bannerEndDay(event) >= today);
}
export function escapeCalendarText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}
export function foldCalendarLine(value) {
  let line = '', bytes = 0;
  const lines = [];
  for (const character of value) {
    const length = new TextEncoder().encode(character).length;
    if (bytes + length > 75) { lines.push(line); line = ' '; bytes = 1; }
    line += character; bytes += length;
  }
  return [...lines,line].join('\r\n');
}
const utc = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const calendarDate = value => value.replace(/-/g,'');
const nextDay = value => new Date(Date.parse(value) + 86400000).toISOString().slice(0,10);
/** @param {CalendarEvent} event */
function eventLines(event, now) {
  if (!hasCalendarDownload(event)) throw new Error('Calendar events require a stable ID and a valid date or zoned start time.');
  const allDay = isDateOnly(event.datetime);
  if (allDay && (event.endDatetime || (event.endDate && (!isDateOnly(event.endDate) || event.endDate < event.datetime)))) throw new Error('Date-only events require an inclusive end date on or after the start date.');
  if (!allDay && (event.endDate || (event.endDatetime && (!validTime(event.endDatetime) || Date.parse(event.endDatetime) <= Date.parse(event.datetime))))) throw new Error('Timed event end must be a zoned time after the start.');
  const description = [event.description, event.host ? `Host: ${event.host}` : '', event.status, !allDay && !event.endDatetime ? 'End time not provided.' : '', event.url ? `Details: ${event.url}` : ''].filter(Boolean).join('\n\n');
  return [
    'BEGIN:VEVENT', `UID:${event.calendarId}@s3s-events`, `DTSTAMP:${utc(now)}`, `LAST-MODIFIED:${utc(now)}`,
    ...(allDay ? [`DTSTART;VALUE=DATE:${calendarDate(event.datetime)}`, `DTEND;VALUE=DATE:${calendarDate(nextDay(event.endDate || event.datetime))}`, 'TRANSP:TRANSPARENT'] : [`DTSTART:${utc(event.datetime)}`, ...(event.endDatetime ? [`DTEND:${utc(event.endDatetime)}`] : [])]),
    `SUMMARY:${escapeCalendarText(event.title)}`, `DESCRIPTION:${escapeCalendarText(description)}`,
    ...(event.location ? [`LOCATION:${escapeCalendarText(event.location)}`] : []), 'END:VEVENT',
  ];
}
/** @param {CalendarEvent[]} events */
export function createCalendarFeed(events, now = new Date(), subscription = true) {
  const scheduled = events.filter(hasCalendarDownload).sort(compareEventStarts);
  if (new Set(scheduled.map(e=>e.calendarId)).size !== scheduled.length) throw new Error('Calendar event IDs must be unique.');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//S3S//Events//EN', 'CALSCALE:GREGORIAN',
    ...(subscription ? ['X-WR-CALNAME:S3S Events', 'X-WR-TIMEZONE:America/New_York', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'] : []),
    ...scheduled.flatMap(event => eventLines(event,now)), 'END:VCALENDAR'];
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
}
/** @param {CalendarEvent} event */
export function createEventCalendar(event, now = new Date()) {
  if (!hasCalendarDownload(event)) throw new Error('Calendar event is missing a valid date or stable ID.');
  return createCalendarFeed([event],now,false);
}
