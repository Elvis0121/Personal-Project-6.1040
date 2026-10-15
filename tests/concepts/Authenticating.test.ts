import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import {
  AuthenticatingConcept,
  InvalidCredentials,
  InvalidUsername,
  UsernameTaken,
  WeakPassword,
} from "../../src/concepts/Authenticating.ts";
import { openTestDb, type TestDb } from "../test-db.ts";

let testDb: TestDb;
let authenticating: AuthenticatingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  authenticating = new AuthenticatingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("principle: a registered user authenticates with the right password only", async () => {
  const { account } = await authenticating.register({ username: "tinashe", password: "mbare-2026" });
  expect(account).toBe("tinashe");
  expect(await authenticating._registered({ username: "tinashe" })).toEqual({ registered: true });

  await expect(
    authenticating.register({ username: "tinashe", password: "another-one" }),
  ).rejects.toBeInstanceOf(UsernameTaken);
  await expect(
    authenticating.authenticate({ username: "tinashe", password: "wrong-password" }),
  ).rejects.toBeInstanceOf(InvalidCredentials);
  expect(
    await authenticating.authenticate({ username: "tinashe", password: "mbare-2026" }),
  ).toEqual({ account: "tinashe" });
});

test("an unknown username is refused the same way as a wrong password", async () => {
  await expect(
    authenticating.authenticate({ username: "nobody", password: "whatever-1" }),
  ).rejects.toBeInstanceOf(InvalidCredentials);
  expect(await authenticating._registered({ username: "nobody" })).toEqual({ registered: false });
});

test("usernames and passwords outside the allowed shape are refused", async () => {
  await expect(
    authenticating.register({ username: "mr dube", password: "long-enough" }),
  ).rejects.toBeInstanceOf(InvalidUsername);
  await expect(
    authenticating.register({ username: "ab", password: "long-enough" }),
  ).rejects.toBeInstanceOf(InvalidUsername);
  await expect(
    authenticating.register({ username: "mrsdube", password: "short" }),
  ).rejects.toBeInstanceOf(WeakPassword);
  expect(await authenticating._registered({ username: "mrsdube" })).toEqual({ registered: false });
});

test("the password is not stored as written", async () => {
  await authenticating.register({ username: "mrsdube", password: "avondale-cottage" });
  const stored = await testDb.db.collection("authenticating.accounts").findOne({ _id: "mrsdube" as never });
  expect(JSON.stringify(stored)).not.toContain("avondale-cottage");
});
