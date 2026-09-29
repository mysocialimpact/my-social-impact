import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { bookingServices } from '../app/booking-config.ts';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Ask SORP uses the existing three booking services and payment/calendar routes', async () => {
  assert.deepEqual(bookingServices.map(item => [item.id, item.duration, item.priceMinor]), [['free', 10, 0], ['readiness', 30, 5000], ['wider', 60, 10000]]);
  const source = await read('../app/sorp-review-booking.tsx');
  for (const route of ['/api/booking/availability', '/api/booking/free', '/api/booking/payment/create', '/api/booking/payment/finalise']) assert.ok(source.includes(route));
  assert.match(source, /source.*ask-sorp/);
  assert.match(source, /event\.origin !== "https:\/\/sorp2026\.mysocialimpact\.org"/);
  assert.match(source, /EMAIL FROM ASK SORP/);
  assert.match(source, /setEmailFromAskSorp\(true\)/);
  assert.match(source, /ask-sorp-booking-completed/);
});

test('Ask SORP booking has accurate copy and returns to Ask SORP', async () => {
  const source = await read('../app/sorp-review-booking.tsx');
  const page = await read('../app/are-you-sorp-ready/review/booking/page.tsx');
  assert.match(source, /A quick conversation to work out what you need/);
  assert.match(source, /Talk through an impact-reporting or SORP question/);
  assert.match(source, /A deeper working session on impact, evidence/);
  assert.match(page, /https:\/\/sorp2026\.mysocialimpact\.org\//);
  assert.match(page, /BACK TO.*ASK SORP/);
});

test('confirmed bookings use the existing server-side Grow connection', async () => {
  const { recordAskSorpBooking } = await import('../app/booking-growth.ts');
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.COW_GROWTH_EVENT_URL;
  const originalKey = process.env.COW_GROWTH_EVENT_KEY;
  process.env.COW_GROWTH_EVENT_URL = 'https://cow.example/api/growth/events';
  process.env.COW_GROWTH_EVENT_KEY = 'test-key';
  const sent = [];
  globalThis.fetch = async (url, options) => { sent.push({ url, payload: JSON.parse(options.body) }); return Response.json({ accepted: true }); };
  try {
    await recordAskSorpBooking({ source: 'sorp-review', reviewSessionId: 'be74b240-5598-4f80-a82b-123456789abc' }, 'free', '2026-09-30T10:00:00Z', 'booking-one');
    assert.equal(sent.length, 0);
    await recordAskSorpBooking({ source: 'ask-sorp', reviewSessionId: 'be74b240-5598-4f80-a82b-123456789abc' }, 'readiness', '2026-09-30T10:00:00Z', 'booking-two');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, 'https://cow.example/api/growth/events');
    assert.equal(sent[0].payload.eventType, 'ask_sorp_booking_completed');
    assert.equal(sent[0].payload.details.serviceId, 'readiness');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.COW_GROWTH_EVENT_URL; else process.env.COW_GROWTH_EVENT_URL = originalUrl;
    if (originalKey === undefined) delete process.env.COW_GROWTH_EVENT_KEY; else process.env.COW_GROWTH_EVENT_KEY = originalKey;
  }
});
