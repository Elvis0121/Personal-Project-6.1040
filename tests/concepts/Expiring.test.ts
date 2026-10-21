import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AlreadyTimed,
  ExpiringConcept,
  InvalidDuration,
  NoSuchTimer,
  NotCurrent,
  StillCurrent,
} from "../../src/concepts/Expiring.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

let testDb: TestDb;
let now: Date;
let expiring: ExpiringConcept;

beforeAll(async () => {
  testDb = await openTestDb();
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-21T12:00:00Z");
  expiring = new ExpiringConcept(testDb.db, () => now);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: current until the deadline, renew keeps it, expire deletes the timer", async () => {
  const started = await expiring.start({ resource: "cottage", duration: MONTH_MS });
  expect(started.deadline.getTime()).toBe(now.getTime() + MONTH_MS);
  expect(await expiring._isCurrent({ resource: "cottage" })).toEqual({ current: true });
  expect(await expiring._get({ resource: "cottage" })).toEqual([{ deadline: started.deadline }]);
  expect(await expiring._due({})).toEqual([]);

  now = new Date(now.getTime() + Math.floor(MONTH_MS / 3));
  const renewed = await expiring.renew({ resource: "cottage", duration: MONTH_MS });
  expect(renewed.deadline.getTime()).toBe(now.getTime() + MONTH_MS);
  expect(await expiring._isCurrent({ resource: "cottage" })).toEqual({ current: true });
  await expect(expiring.start({ resource: "cottage", duration: MONTH_MS })).rejects.toBeInstanceOf(AlreadyTimed);

  now = new Date(renewed.deadline.getTime() + 1);
  expect(await expiring._isCurrent({ resource: "cottage" })).toEqual({ current: false });
  await expect(expiring.renew({ resource: "cottage", duration: MONTH_MS })).rejects.toBeInstanceOf(NotCurrent);
  expect(await expiring._due({})).toEqual([{ resource: "cottage", deadline: renewed.deadline }]);

  expect(await expiring.expire({ resource: "cottage" })).toEqual({ resource: "cottage" });
  expect(await expiring._isCurrent({ resource: "cottage" })).toEqual({ current: false });
  expect(await expiring._get({ resource: "cottage" })).toEqual([]);
  expect(await expiring._due({})).toEqual([]);
  await expect(expiring.start({ resource: "cottage", duration: MONTH_MS })).resolves.toMatchObject({
    resource: "cottage",
  });
});

test("duration must be a positive number of milliseconds", async () => {
  await expect(expiring.start({ resource: "cottage", duration: 0 })).rejects.toBeInstanceOf(InvalidDuration);
  await expect(expiring.start({ resource: "cottage", duration: -1 })).rejects.toBeInstanceOf(InvalidDuration);
  await expect(expiring.start({ resource: "cottage", duration: Number.NaN })).rejects.toBeInstanceOf(
    InvalidDuration,
  );
  await expect(expiring.reschedule({ resource: "cottage", duration: 0 })).rejects.toBeInstanceOf(
    InvalidDuration,
  );
  await expect(expiring.renew({ resource: "cottage", duration: 0 })).rejects.toBeInstanceOf(InvalidDuration);
});

test("reschedule works on an existing timer even after the deadline", async () => {
  await expect(expiring.reschedule({ resource: "cottage", duration: MONTH_MS })).rejects.toBeInstanceOf(
    NoSuchTimer,
  );

  const started = await expiring.start({ resource: "cottage", duration: MONTH_MS });
  now = new Date(started.deadline.getTime() + 1);
  expect(await expiring._isCurrent({ resource: "cottage" })).toEqual({ current: false });

  const moved = await expiring.reschedule({ resource: "cottage", duration: MONTH_MS });
  expect(moved.deadline.getTime()).toBe(now.getTime() + MONTH_MS);
  expect(await expiring._isCurrent({ resource: "cottage" })).toEqual({ current: true });
  expect(await expiring._due({})).toEqual([]);
});

test("expire refuses a missing or still-current timer", async () => {
  await expect(expiring.expire({ resource: "cottage" })).rejects.toBeInstanceOf(NoSuchTimer);
  await expect(expiring.renew({ resource: "cottage", duration: MONTH_MS })).rejects.toBeInstanceOf(NoSuchTimer);

  await expiring.start({ resource: "cottage", duration: MONTH_MS });
  await expect(expiring.expire({ resource: "cottage" })).rejects.toBeInstanceOf(StillCurrent);
  expect(await expiring._isCurrent({ resource: "cottage" })).toEqual({ current: true });
});

test("due lists oldest deadline first, and a deadline exactly now is due", async () => {
  const cottage = await expiring.start({ resource: "cottage", duration: MONTH_MS });
  now = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const room = await expiring.start({ resource: "room", duration: MONTH_MS });

  now = cottage.deadline;
  expect(await expiring._isCurrent({ resource: "cottage" })).toEqual({ current: false });
  expect(await expiring._isCurrent({ resource: "room" })).toEqual({ current: true });
  expect(await expiring._due({})).toEqual([{ resource: "cottage", deadline: cottage.deadline }]);

  now = new Date(room.deadline.getTime() + 1);
  expect(await expiring._due({})).toEqual([
    { resource: "cottage", deadline: cottage.deadline },
    { resource: "room", deadline: room.deadline },
  ]);

  await expiring.expire({ resource: "cottage" });
  expect(await expiring._due({})).toEqual([{ resource: "room", deadline: room.deadline }]);
});
