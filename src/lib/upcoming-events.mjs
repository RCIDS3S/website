import { hasCalendarDownload, isDateOnly, compareEventStarts } from './event-calendar.mjs';
import { easternDateKey } from './calendar-month.mjs';

/** @param {import('./event-calendar.mjs').CalendarEvent[]} events */
export function upcomingEvents(events, now = Date.now(), limit = 3) {
  const today = easternDateKey(now);
  return events.filter(event => hasCalendarDownload(event) && (isDateOnly(event.datetime) ? event.datetime >= today : Date.parse(event.datetime) > Number(now)))
    .sort(compareEventStarts).slice(0,limit);
}
