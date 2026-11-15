import { hasCalendarDownload } from './event-calendar.mjs';

/**
 * Select scheduled events by absolute start time, independent of the visitor's timezone.
 * @param {import('./event-calendar.mjs').CalendarEvent[]} events
 */
export function upcomingEvents(events, now = Date.now(), limit = 3) {
  return events
    .filter((event) => hasCalendarDownload(event) && Date.parse(event.datetime) > Number(now))
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime))
    .slice(0, limit);
}
