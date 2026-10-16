import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AlreadyAnswered,
  AlreadyRequested,
  IntroducingConcept,
  MissingContact,
  NoSuchIntroduction,
  NotHolder,
  SelfIntroduction,
} from "../../src/concepts/Introducing.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let introducing: IntroducingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  introducing = new IntroducingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

const ask = { requester: "tinashe", holder: "mrsdube", subject: "cottage" };

test("principle: the contact is disclosed only after the holder accepts, and only to the requester", async () => {
  const { introduction } = await introducing.request(ask);
  expect(await introducing._mine({ requester: "tinashe", subject: "cottage" })).toEqual([
    { introduction, status: "PENDING" },
  ]);
  expect(await introducing._disclosed({ requester: "tinashe", subject: "cottage" })).toEqual([]);

  await introducing.accept({ holder: "mrsdube", introduction, contact: "0772 429 864" });
  expect(await introducing._disclosed({ requester: "tinashe", subject: "cottage" })).toEqual([
    { contact: "0772 429 864" },
  ]);
  expect(await introducing._disclosed({ requester: "chipo", subject: "cottage" })).toEqual([]);
  expect(JSON.stringify(await introducing._get({ introduction }))).not.toContain("0772");
});

test("a declined requester never sees the contact and cannot ask again", async () => {
  const { introduction } = await introducing.request(ask);
  await introducing.decline({ holder: "mrsdube", introduction });
  expect(await introducing._disclosed({ requester: "tinashe", subject: "cottage" })).toEqual([]);
  await expect(introducing.request(ask)).rejects.toBeInstanceOf(AlreadyRequested);
  await expect(
    introducing.accept({ holder: "mrsdube", introduction, contact: "0772" }),
  ).rejects.toBeInstanceOf(AlreadyAnswered);
});

test("only the holder can answer, and only with a contact", async () => {
  const { introduction } = await introducing.request(ask);
  await expect(
    introducing.accept({ holder: "tinashe", introduction, contact: "0772" }),
  ).rejects.toBeInstanceOf(NotHolder);
  await expect(introducing.decline({ holder: "chipo", introduction })).rejects.toBeInstanceOf(NotHolder);
  await expect(
    introducing.accept({ holder: "mrsdube", introduction, contact: " " }),
  ).rejects.toBeInstanceOf(MissingContact);
  await expect(
    introducing.accept({ holder: "mrsdube", introduction: "missing", contact: "0772" }),
  ).rejects.toBeInstanceOf(NoSuchIntroduction);
  expect(await introducing._mine({ requester: "tinashe", subject: "cottage" })).toEqual([
    { introduction, status: "PENDING" },
  ]);
});

test("nobody can ask to be introduced to themselves, and duplicate requests race safely", async () => {
  await expect(
    introducing.request({ requester: "mrsdube", holder: "mrsdube", subject: "cottage" }),
  ).rejects.toBeInstanceOf(SelfIntroduction);
  const results = await Promise.allSettled([introducing.request(ask), introducing.request(ask)]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
});

test("the holder sees requests in order, and reset clears all but accepted ones", async () => {
  const first = await introducing.request(ask);
  const second = await introducing.request({ ...ask, requester: "chipo" });
  const third = await introducing.request({ ...ask, requester: "farai" });
  await introducing.accept({ holder: "mrsdube", introduction: first.introduction, contact: "0772" });
  await introducing.decline({ holder: "mrsdube", introduction: second.introduction });

  const received = await introducing._received({ holder: "mrsdube", subject: "cottage" });
  expect(received.map(({ requester, status }) => [requester, status])).toEqual([
    ["tinashe", "ACCEPTED"],
    ["chipo", "DECLINED"],
    ["farai", "PENDING"],
  ]);
  expect(await introducing._received({ holder: "tinashe", subject: "cottage" })).toEqual([]);

  await introducing.reset({ subject: "cottage" });
  expect(await introducing._received({ holder: "mrsdube", subject: "cottage" })).toEqual([
    { introduction: first.introduction, requester: "tinashe", status: "ACCEPTED" },
  ]);
  expect(await introducing._get({ introduction: third.introduction })).toEqual([]);
  await expect(introducing.request({ ...ask, requester: "chipo" })).resolves.toHaveProperty("introduction");
});
