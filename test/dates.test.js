import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, mondayOf, localToday } from '../lib/dates.js';

test('addDays crosses month boundaries both ways', () => {
  assert.equal(addDays('2026-02-27', 2), '2026-03-01');
  assert.equal(addDays('2026-09-18', -29), '2026-08-20');
});
test('daysBetween', () => assert.equal(daysBetween('2026-09-01', '2026-09-18'), 17));
test('mondayOf', () => {
  assert.equal(mondayOf('2026-09-18'), '2026-09-14'); // Friday
  assert.equal(mondayOf('2026-09-14'), '2026-09-14'); // Monday
  assert.equal(mondayOf('2026-09-20'), '2026-09-14'); // Sunday
});
test('localToday uses local calendar date', () => {
  assert.equal(localToday(new Date(2026, 8, 5, 23, 30)), '2026-09-05');
});
