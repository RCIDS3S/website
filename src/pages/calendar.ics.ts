import type { APIRoute } from 'astro';
import events from '../data/events.json';
import { createCalendarFeed } from '../lib/event-calendar.mjs';

export const GET: APIRoute = () => new Response(createCalendarFeed(events.items), {
  headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
});
