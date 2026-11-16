import { CALENDAR_TIME_ZONE, easternDateKey } from './calendar-month.mjs';
import { bannerEndDay, compareEventStarts, eventEndDay, eventStartDay, hasCalendarDownload, isDateOnly } from './event-calendar.mjs';

const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone: CALENDAR_TIME_ZONE, hour: 'numeric', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
const dateRange = (start, end) => `${dateFormat.format(new Date(start))}–${dateFormat.format(new Date(end))}`;

/** Build all notices so an open page can update at Eastern midnight without a rebuild. */
export function eventAnnouncements(events) {
  const scheduled = events.filter(hasCalendarDownload).sort(compareEventStarts);
  const daily = scheduled.filter(event => !event.banner).map(event => {
    const start = eventStartDay(event);
    const end = eventEndDay(event);
    const period = start !== end;
    const time = isDateOnly(event.datetime) ? (period ? dateRange(start, end) : '')
      : `${timeFormat.format(new Date(event.datetime))}${event.endDatetime ? `–${timeFormat.format(new Date(event.endDatetime))}` : ''} ET`;
    return {
      id: event.calendarId, start, end: start,
      title: `${period ? 'Starts today' : 'Today'}: ${event.title}`,
      detail: time, href: `/calendar/?event=${event.calendarId}`, external: false,
    };
  });
  const periods = scheduled.filter(event => event.banner && isDateOnly(event.datetime) && isDateOnly(bannerEndDay(event))).map(event => ({
    id: event.calendarId, start: event.datetime, end: bannerEndDay(event),
    title: event.banner, detail: dateRange(event.datetime, bannerEndDay(event)),
    href: event.url || `/calendar/?event=${event.calendarId}`, external: Boolean(event.url),
  }));
  return [...daily, ...periods];
}

export function announcementIsActive(announcement, now = Date.now()) {
  const today = easternDateKey(now);
  return announcement.start <= today && announcement.end >= today;
}
