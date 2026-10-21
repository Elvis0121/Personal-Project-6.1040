import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AlreadyAppointed,
  AlreadyCurrent,
  EmptyEvidence,
  InvalidReviewer,
  NoSuchVerification,
  NotPending,
  NotReviewer,
  NotVerified,
  VerifyingConcept,
} from "../../src/concepts/Verifying.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let verifying: VerifyingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  verifying = new VerifyingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

const bill = "rates bill, City of Harare, Avondale cottage, Sept 2026";

test("principle: only the reviewer sees the evidence, and decidedBy survives revoke", async () => {
  await verifying.appoint({ reviewer: "kumba" });
  const { verification } = await verifying.submit({
    advertiser: "mrsdube",
    subject: "cottage",
    evidence: bill,
  });

  expect(await verifying._isVerified({ subject: "cottage" })).toEqual({ verified: false });
  expect(await verifying._evidence({ reviewer: "tinashe", verification })).toEqual([]);
  expect(await verifying._evidence({ reviewer: "mrsdube", verification })).toEqual([]);
  expect(await verifying._evidence({ reviewer: "kumba", verification })).toEqual([{ evidence: bill }]);
  expect(JSON.stringify(await verifying._get({ verification }))).not.toContain("rates");
  expect(JSON.stringify(await verifying._pending({}))).not.toContain("rates");

  await verifying.verify({ reviewer: "kumba", verification });
  expect(await verifying._isVerified({ subject: "cottage" })).toEqual({ verified: true });
  expect(await verifying._forSubject({ subject: "cottage" })).toEqual([
    { verification, status: "VERIFIED", decidedBy: "kumba" },
  ]);

  await verifying.revoke({ subject: "cottage" });
  expect(await verifying._isVerified({ subject: "cottage" })).toEqual({ verified: false });
  expect(await verifying._forSubject({ subject: "cottage" })).toEqual([]);
  expect(await verifying._get({ verification })).toEqual([
    { advertiser: "mrsdube", subject: "cottage", status: "REJECTED", decidedBy: "kumba" },
  ]);
});

test("appoint succeeds once, and blank names are refused", async () => {
  await expect(verifying.appoint({ reviewer: "  " })).rejects.toBeInstanceOf(InvalidReviewer);
  expect(await verifying.appoint({ reviewer: "kumba" })).toEqual({ reviewer: "kumba" });
  await expect(verifying.appoint({ reviewer: "other" })).rejects.toBeInstanceOf(AlreadyAppointed);
  expect(await verifying._isReviewer({ user: "kumba" })).toEqual({ appointed: true });
  expect(await verifying._isReviewer({ user: "other" })).toEqual({ appointed: false });
});

test("submit refuses empty evidence and a second current proof", async () => {
  await verifying.appoint({ reviewer: "kumba" });
  await expect(
    verifying.submit({ advertiser: "mrsdube", subject: "cottage", evidence: " " }),
  ).rejects.toBeInstanceOf(EmptyEvidence);

  const first = await verifying.submit({ advertiser: "mrsdube", subject: "cottage", evidence: bill });
  await expect(
    verifying.submit({ advertiser: "mrsdube", subject: "cottage", evidence: "title deed" }),
  ).rejects.toBeInstanceOf(AlreadyCurrent);

  await verifying.verify({ reviewer: "kumba", verification: first.verification });
  await expect(
    verifying.submit({ advertiser: "mrsdube", subject: "cottage", evidence: "title deed" }),
  ).rejects.toBeInstanceOf(AlreadyCurrent);

  await verifying.revoke({ subject: "cottage" });
  await expect(
    verifying.submit({ advertiser: "mrsdube", subject: "cottage", evidence: "title deed" }),
  ).resolves.toHaveProperty("verification");
});

test("only the appointed reviewer can verify or reject, and only while pending", async () => {
  await verifying.appoint({ reviewer: "kumba" });
  const { verification } = await verifying.submit({
    advertiser: "mrsdube",
    subject: "cottage",
    evidence: bill,
  });

  await expect(verifying.verify({ reviewer: "tinashe", verification })).rejects.toBeInstanceOf(NotReviewer);
  await expect(verifying.reject({ reviewer: "tinashe", verification })).rejects.toBeInstanceOf(NotReviewer);
  await expect(verifying.verify({ reviewer: "kumba", verification: "missing" })).rejects.toBeInstanceOf(
    NoSuchVerification,
  );

  await verifying.verify({ reviewer: "kumba", verification });
  await expect(verifying.verify({ reviewer: "kumba", verification })).rejects.toBeInstanceOf(NotPending);
  await expect(verifying.reject({ reviewer: "kumba", verification })).rejects.toBeInstanceOf(NotPending);
  expect(await verifying._isVerified({ subject: "cottage" })).toEqual({ verified: true });
});

test("reject records decidedBy and then allows a fresh submit", async () => {
  await verifying.appoint({ reviewer: "kumba" });
  const first = await verifying.submit({ advertiser: "mrsdube", subject: "cottage", evidence: bill });
  await verifying.reject({ reviewer: "kumba", verification: first.verification });

  expect(await verifying._get({ verification: first.verification })).toEqual([
    { advertiser: "mrsdube", subject: "cottage", status: "REJECTED", decidedBy: "kumba" },
  ]);
  expect(await verifying._forSubject({ subject: "cottage" })).toEqual([]);
  expect(await verifying._pending({})).toEqual([]);

  const second = await verifying.submit({
    advertiser: "mrsdube",
    subject: "cottage",
    evidence: "owner's letter",
  });
  expect(await verifying._pending({})).toEqual([
    { verification: second.verification, advertiser: "mrsdube", subject: "cottage" },
  ]);
  expect(await verifying._forSubject({ subject: "cottage" })).toEqual([
    { verification: second.verification, status: "PENDING", decidedBy: null },
  ]);
});

test("revoke refuses an unverified subject and does not clear decidedBy", async () => {
  await verifying.appoint({ reviewer: "kumba" });
  await expect(verifying.revoke({ subject: "cottage" })).rejects.toBeInstanceOf(NotVerified);

  const { verification } = await verifying.submit({
    advertiser: "mrsdube",
    subject: "cottage",
    evidence: bill,
  });
  await expect(verifying.revoke({ subject: "cottage" })).rejects.toBeInstanceOf(NotVerified);

  await verifying.verify({ reviewer: "kumba", verification });
  await verifying.revoke({ subject: "cottage" });
  const stored = await testDb.db.collection("verifying.verifications").findOne({ _id: verification as never });
  expect(stored).toMatchObject({ status: "REJECTED", decidedBy: "kumba", evidence: bill });
});

test("pending lists oldest first and never includes evidence", async () => {
  await verifying.appoint({ reviewer: "kumba" });
  const first = await verifying.submit({ advertiser: "mrsdube", subject: "a", evidence: "bill-a" });
  const second = await verifying.submit({ advertiser: "mrmoyo", subject: "b", evidence: "bill-b" });
  expect(await verifying._pending({})).toEqual([
    { verification: first.verification, advertiser: "mrsdube", subject: "a" },
    { verification: second.verification, advertiser: "mrmoyo", subject: "b" },
  ]);
});
