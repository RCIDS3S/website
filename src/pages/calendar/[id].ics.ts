import type { APIRoute } from 'astro';
import events from '../../data/events.json';
import { createEventCalendar, hasCalendarDownload } from '../../lib/event-calendar.mjs';

export function getStaticPaths() {
  const scheduled = events.items.filter(hasCalendarDownload);
  const ids = scheduled.map((event) => event.calendarId);
  if (new Set(ids).size !== ids.length) throw new Error('Calendar event IDs must be unique.');
  return scheduled.map((event) => ({ params: { id: event.calendarId }, props: { event } }));
}

export const GET: APIRoute = ({ props }) => new Response(createEventCalendar(props.event), {
  headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
});
