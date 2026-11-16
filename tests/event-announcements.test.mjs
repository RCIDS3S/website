import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { eventAnnouncements, announcementIsActive } from '../src/lib/event-announcements.mjs';
const events = JSON.parse(fs.readFileSync(new URL('../src/data/events.json', import.meta.url))).items;
const banners = eventAnnouncements(events);
const visible = now => banners.filter(banner => announcementIsActive(banner, Date.parse(now)));

test('day-of banner shows both November 16 events and the existing registration notice', () => {
  const today = visible('2026-11-16T12:00:00-05:00');
  assert.deepEqual(today.map(banner => banner.id), ['rcid-defense-2026-11-16', 'project-management-2026-11-16', 'spring-registration-period-2027']);
  assert.equal(today[0].detail, '1:00 PM ET');
  assert.equal(today[1].detail, '1:00 PM–2:00 PM ET');
  assert.equal(today[0].href, '/calendar/?event=rcid-defense-2026-11-16');
  assert.equal(today[0].external, false);
});

test('today follows Eastern midnight and daylight saving, including dates with no event', () => {
  const april = banners.find(banner => banner.id === 'rcid-professional-development-2027-04-15');
  assert.equal(april.detail, '3:30 PM ET');
  assert.equal(announcementIsActive(april, Date.parse('2027-04-15T03:59:59Z')), false);
  assert.equal(announcementIsActive(april, Date.parse('2027-04-15T04:00:00Z')), true);
  assert.equal(announcementIsActive(april, Date.parse('2027-04-16T03:59:59Z')), true);
  assert.equal(announcementIsActive(april, Date.parse('2027-04-16T04:00:00Z')), false);
  assert.equal(visible('2027-04-16T12:00:00-04:00').length, 0);
  assert.equal(visible('2026-11-16T04:59:59Z').length, 1);
  assert.equal(visible('2026-11-16T05:00:00Z').length, 3);
});

test('date reminders appear on their date and multi-day periods appear only on their opening day', () => {
  const deadline = visible('2027-01-12T12:00:00-05:00').find(banner => banner.id === 'spring-registration-deadline-2027');
  assert.ok(deadline.title.startsWith('Today:'));
  assert.equal(deadline.detail, '');
  const thanksgiving = visible('2026-11-25T12:00:00-05:00').find(banner => banner.id === 'thanksgiving-2026');
  assert.ok(thanksgiving.title.startsWith('Starts today:'));
  assert.ok(!visible('2026-11-26T12:00:00-05:00').some(banner => banner.id === 'thanksgiving-2026'));
  assert.equal(banners.filter(banner => banner.id === 'spring-registration-period-2027').length, 1);
  assert.doesNotMatch(JSON.stringify(banners), /zoom\.us|pwd=/);
});
