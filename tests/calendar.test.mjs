import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCalendarFeed, createEventCalendar, activePeriods, eventStartDay, eventEndDay} from '../src/lib/event-calendar.mjs';
import {upcomingEvents} from '../src/lib/upcoming-events.mjs';
const events = JSON.parse(fs.readFileSync(new URL('../src/data/events.json',import.meta.url))).items;
const byId = id => events.find(event=>event.calendarId===id);
const unfold = value => value.replace(/\r\n /g,'');
const uid = value => value.match(/^UID:(.+)$/m)[1].trim();

test('subscription includes the same stable UIDs as downloads, preserving identity after a reschedule',()=>{
  const event = byId('ai-answers-2026-11-17');
  const feed = unfold(createCalendarFeed(events,new Date('2026-11-15T12:00Z')));
  assert.equal((feed.match(/BEGIN:VEVENT/g)||[]).length,18);
  const ids = [...feed.matchAll(/^UID:(.+)$/gm)].map(match=>match[1].trim());
  assert.equal(new Set(ids).size,18);
  for(const event of events.filter(e=>e.calendarId)) assert.ok(ids.includes(uid(createEventCalendar(event))));
  const changed = {...event, datetime:'2026-11-20T12:00:00-05:00',endDatetime:'2026-11-20T12:30:00-05:00'};
  assert.equal(uid(createEventCalendar(changed)),uid(createEventCalendar(event)));
  assert.match(createCalendarFeed([changed]),/DTSTART:20261120T170000Z/);
  assert.match(feed,/Host: Clemson Libraries/);
  assert.match(feed,/Details: https:\/\/clemson.libcal.com\/event\/17973520/);
  assert.doesNotMatch(feed,/zoom\.us|pwd=|Meghan Sweet|Jennifer DeLong/);
});
test('all-day ranges use an exclusive ICS end without inventing a time',()=>{
  const thanksgiving = createEventCalendar(byId('thanksgiving-2026'));
  assert.match(thanksgiving,/DTSTART;VALUE=DATE:20261125/);
  assert.match(thanksgiving,/DTEND;VALUE=DATE:20261128/);
  const deadline = createEventCalendar(byId('spring-registration-deadline-2027'));
  assert.match(deadline,/DTEND;VALUE=DATE:20270113/);
  assert.doesNotMatch(deadline,/DTSTART:\d+T|End time not provided/);
  const leap={...byId('thanksgiving-2026'),datetime:'2028-02-28',endDate:'2028-02-29'};
  assert.match(createEventCalendar(leap),/DTEND;VALUE=DATE:20280301/);
  assert.equal(eventStartDay(leap),'2028-02-28');
  assert.equal(eventEndDay(leap),'2028-02-29');
  assert.throws(()=>createEventCalendar({...leap,endDate:'2028-02-27'}));
  assert.throws(()=>createEventCalendar({...leap,endDate:'2028-02-30'}));
});
test('banner periods expire at Eastern midnight, including DST and the final day',()=>{
  const period = byId('spring-registration-period-2027');
  assert.equal(activePeriods([period],Date.parse('2026-11-04T04:59:59Z')).length,0);
  assert.equal(activePeriods([period],Date.parse('2026-11-04T05:00:00Z')).length,1);
  assert.equal(activePeriods([period],Date.parse('2027-01-13T04:59:59Z')).length,1);
  assert.equal(activePeriods([period],Date.parse('2027-01-13T05:00:00Z')).length,0);
  const summer={...period,datetime:'2027-04-05',bannerEndDate:'2027-04-06'};
  assert.equal(activePeriods([summer],Date.parse('2027-04-05T03:59:59Z')).length,0);
  assert.equal(activePeriods([summer],Date.parse('2027-04-05T04:00:00Z')).length,1);
});
test('upcoming selection includes three chronologically sorted events, with date reminders through their Eastern day',()=>{
  const selected = upcomingEvents(events,Date.parse('2026-11-15T12:00:00-05:00'));
  assert.deepEqual(selected.map(e=>e.calendarId),['rcid-defense-2026-11-16','project-management-2026-11-16','ai-answers-2026-11-17']);
  const deadline=byId('spring-registration-deadline-2027');
  assert.equal(upcomingEvents([deadline],Date.parse('2027-01-13T04:59:59Z')).length,1);
  assert.equal(upcomingEvents([deadline],Date.parse('2027-01-13T05:00:00Z')).length,0);
  assert.equal(upcomingEvents(events,Date.parse('2028-01-01')).length,0);
});
test('calendar rejects duplicate IDs and folds UTF-8 text without corrupting the content',()=>{
  const event={...byId('ai-answers-2026-11-17'), title:'é'.repeat(100)+'; one, two\nthree'};
  assert.throws(()=>createCalendarFeed([event,event]));
  const file=createEventCalendar(event);
  for(const line of file.split('\r\n')) assert.ok(Buffer.byteLength(line,'utf8')<=75);
  assert.ok(unfold(file).includes('SUMMARY:'+'é'.repeat(100)+'\\; one\\, two\\nthree'));
});


test('registration subscription is two milestones while the banner remains active',()=>{
  const opening=byId('spring-registration-period-2027');
  const closing=byId('spring-registration-deadline-2027');
  const calendar=createCalendarFeed([opening,closing]);
  assert.match(calendar,/DTSTART;VALUE=DATE:20261104/);
  assert.match(calendar,/DTEND;VALUE=DATE:20261105/);
  assert.match(calendar,/DTSTART;VALUE=DATE:20270112/);
  assert.match(calendar,/DTEND;VALUE=DATE:20270113/);
  assert.equal(eventEndDay(opening),'2026-11-04');
  assert.equal(activePeriods([opening],Date.parse('2026-12-15T12:00:00-05:00')).length,1);
  assert.equal(uid(createEventCalendar(opening)),'spring-registration-period-2027@s3s-events');
});
