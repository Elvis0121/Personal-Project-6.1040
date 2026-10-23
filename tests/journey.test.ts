/**
 * The user journey through the real endpoints, HTTP policy, session cookie,
 * and MongoDB. Requests go straight to the HTTP handler, so no server is started.
 */
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication, expireDue } from "../src/assembly.ts";
import { VerifyingConcept } from "../src/concepts/Verifying.ts";
import { LISTING_LIFETIME_MS } from "../src/listing-lifetime.ts";
import { policy } from "../src/http.ts";
import { openTestDb, type TestDb } from "./test-db.ts";

const ORIGIN = "http://127.0.0.1:8080";
const bill = "rates bill, City of Harare, Avondale cottage, Sept 2026";

let testDb: TestDb;
let now: Date;
let application: ReturnType<typeof assembleApplication>;
let handle: (request: Request) => Promise<Response>;

beforeAll(async () => {
  testDb = await openTestDb();
});

beforeEach(async () => {
  await testDb.db.dropDatabase();
  now = new Date("2026-10-21T12:00:00Z");
  application = assembleApplication(testDb.db, () => now);
  handle = createHttpHandler({ application, gateway: createGateway({ application }), policy });
});

afterAll(async () => {
  await testDb.close();
});

/** Posts to an endpoint the way the browser does, with the frontend's origin and an optional session cookie. */
async function post(path: string, body: object, cookie?: string, origin = ORIGIN) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: origin };
  if (cookie) headers.Cookie = cookie;
  const response = await handle(
    new Request(`http://127.0.0.1:3000/api${path}`, { method: "POST", headers, body: JSON.stringify(body) }),
  );
  return { status: response.status, body: await response.json(), setCookie: response.headers.get("set-cookie") };
}

async function register(username: string, password: string): Promise<string> {
  const { status, setCookie } = await post("/auth/register", { username, password });
  expect(status).toBe(200);
  expect(setCookie).toContain("HttpOnly");
  return setCookie!.split(";")[0]!;
}

const cottage = {
  location: "Avondale, Harare",
  kind: "Cottage",
  currency: "USD",
  rent: 150,
  deposit: 150,
  extras: "Water billed separately. No viewing fee.",
  moveIn: "2026-11-01",
  contact: "0772 429 864",
};

test("journey: a tenant finds a verified place, is introduced, and the landlord marks it let", async () => {
  const kumba = await register("kumba", "kumba-lets-2026");
  await new VerifyingConcept(testDb.db).appoint({ reviewer: "kumba" });
  const dube = await register("mrsdube", "avondale-cottage");
  const tinashe = await register("tinashe", "mbare-2026");

  const published = await post("/listings/publish", cottage, dube);
  expect(published.status).toBe(200);
  const { listing } = published.body;

  // Unverified still searchable. Tinashe sees the terms, not the number.
  const before = await post("/listings/search", { area: "avondale", maxRent: 200 });
  expect(before.body.results.listings).toHaveLength(1);
  expect(before.body.results.listings[0]).toMatchObject({ listing, rent: 150, deposit: 150, verified: false });
  expect(JSON.stringify(before.body)).not.toContain(cottage.contact);

  expect((await post("/listings/submit-proof", { listing, evidence: bill }, dube)).status).toBe(200);
  const { verification } = (await post("/review/queue", {}, kumba)).body.queue.items[0];
  expect((await post("/review/verify", { verification }, kumba)).status).toBe(200);

  // After Kumba checks, search shows VERIFIED and still no bill, no number.
  const search = await post("/listings/search", { area: "avondale", maxRent: 200 });
  expect(search.body.results.listings[0]).toMatchObject({ listing, verified: true });
  const view = await post("/listings/view", { listing });
  expect(view.body.terms).toMatchObject({ owner: "mrsdube", status: "OPEN", verified: true });
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0].proof).toBe("VERIFIED");
  expect(JSON.stringify([search.body, view.body])).not.toContain(cottage.contact);
  expect(JSON.stringify([search.body, view.body])).not.toContain("rates");

  expect((await post("/listings/confirm", { listing }, dube)).status).toBe(200);

  // He asks, and nothing is disclosed while the request is pending.
  const asked = await post("/introductions/request", { listing }, tinashe);
  expect(asked.status).toBe(200);
  const { introduction } = asked.body;
  const pending = await post("/introductions/mine", { listing }, tinashe);
  expect(pending.body.mine).toEqual({ introduction, status: "PENDING", contact: null });

  // Mrs Dube sees the request on her listing and accepts it.
  const mine = await post("/listings/mine", {}, dube);
  expect(mine.body.mine.listings[0].requests).toEqual([{ introduction, requester: "tinashe", status: "PENDING" }]);
  expect((await post("/introductions/accept", { introduction }, dube)).status).toBe(200);

  // Now Tinashe sees her number.
  const accepted = await post("/introductions/mine", { listing }, tinashe);
  expect(accepted.body.mine).toEqual({ introduction, status: "ACCEPTED", contact: cottage.contact });

  // Once let, the cottage leaves search and cannot be asked about.
  expect((await post("/listings/mark-let", { listing }, dube)).status).toBe(200);
  const after = await post("/listings/search", { area: "avondale", maxRent: 200 });
  expect(after.body.results.listings).toEqual([]);
  expect((await post("/introductions/request", { listing }, await register("chipo", "chipo-pass-1"))).body).toEqual({
    error: "CONFLICT",
  });
});

test("access control: the session decides who acts, and only the right person can", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const tinashe = await register("tinashe", "mbare-2026");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;

  // No session, a made-up session, or a foreign website are all refused.
  expect((await post("/listings/publish", cottage)).body).toEqual({ error: "UNAUTHORIZED" });
  expect((await post("/listings/mine", {}, "__Host-kumba-session=made-up")).body).toEqual({ error: "UNAUTHORIZED" });
  expect((await post("/listings/mine", {}, dube, "http://evil.example")).body).toEqual({ error: "FORBIDDEN" });

  const visitor = await register("chipo", "chipo-pass-1");
  expect((await post("/auth/sign-out", {}, visitor)).status).toBe(200);
  expect((await post("/listings/mine", {}, visitor)).body).toEqual({ error: "UNAUTHORIZED" });

  // A session value in the body is ignored; the cookie decides who is asking.
  expect((await post("/listings/mine", { session: "anything" }, tinashe)).body.mine.listings).toEqual([]);

  // Tinashe cannot change Mrs Dube's listing or ask about it on her behalf.
  expect((await post("/listings/mark-let", { listing }, tinashe)).body).toEqual({ error: "FORBIDDEN" });
  expect((await post("/listings/confirm", { listing }, tinashe)).body).toEqual({ error: "FORBIDDEN" });
  expect((await post("/listings/withdraw", { listing }, tinashe)).body).toEqual({ error: "FORBIDDEN" });
  expect((await post("/listings/update", { listing, ...cottage, rent: 160 }, tinashe)).body).toEqual({
    error: "FORBIDDEN",
  });
  expect((await post("/listings/submit-proof", { listing, evidence: bill }, tinashe)).body).toEqual({
    error: "FORBIDDEN",
  });
  expect((await post("/introductions/request", { listing }, dube)).body).toEqual({ error: "FORBIDDEN" });
  expect((await post("/review/queue", {}, tinashe)).body).toEqual({ error: "FORBIDDEN" });

  // Only the landlord who was asked can answer, and only once.
  const { introduction } = (await post("/introductions/request", { listing }, tinashe)).body;
  expect((await post("/introductions/request", { listing }, tinashe)).body).toEqual({ error: "CONFLICT" });
  expect((await post("/introductions/accept", { introduction }, tinashe)).body).toEqual({ error: "FORBIDDEN" });
  expect((await post("/introductions/decline", { introduction }, dube)).status).toBe(200);
  expect((await post("/introductions/accept", { introduction }, dube)).body).toEqual({ error: "CONFLICT" });
  expect((await post("/introductions/mine", { listing }, tinashe)).body.mine.contact).toBeNull();
});

test("errors: bad input and unknown things answer with a clear category", async () => {
  await register("mrsdube", "avondale-cottage");
  expect((await post("/auth/register", { username: "mrsdube", password: "another-1" })).body).toEqual({
    error: "CONFLICT",
  });
  expect((await post("/auth/register", { username: "ab", password: "long-enough" })).body).toEqual({
    error: "INVALID_REQUEST",
  });
  expect((await post("/auth/sign-in", { username: "mrsdube", password: "wrong-pass" })).body).toEqual({
    error: "UNAUTHORIZED",
  });

  const dube = (await post("/auth/sign-in", { username: "mrsdube", password: "avondale-cottage" })).setCookie!.split(
    ";",
  )[0]!;
  expect((await post("/listings/publish", { ...cottage, contact: "" }, dube)).body).toEqual({
    error: "INVALID_REQUEST",
  });
  expect((await post("/listings/publish", { ...cottage, rent: -1 }, dube)).body).toEqual({ error: "INVALID_REQUEST" });
  expect((await post("/listings/view", { listing: "missing" })).body).toEqual({ error: "NOT_FOUND" });
  expect((await post("/introductions/accept", { introduction: "missing" }, dube)).body).toEqual({ error: "NOT_FOUND" });

  const { listing } = (await post("/listings/publish", cottage, dube)).body;
  expect((await post("/listings/submit-proof", { listing, evidence: "" }, dube)).body).toEqual({
    error: "INVALID_REQUEST",
  });
});

test("relisting clears pending and declined requests but keeps accepted ones", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const tinashe = await register("tinashe", "mbare-2026");
  const chipo = await register("chipo", "chipo-pass-1");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;

  const first = (await post("/introductions/request", { listing }, tinashe)).body.introduction;
  const second = (await post("/introductions/request", { listing }, chipo)).body.introduction;
  await post("/introductions/accept", { introduction: first }, dube);
  await post("/introductions/decline", { introduction: second }, dube);

  await post("/listings/mark-let", { listing }, dube);
  expect((await post("/listings/relist", { listing }, dube)).status).toBe(200);

  const requests = (await post("/listings/mine", {}, dube)).body.mine.listings[0].requests;
  expect(requests).toEqual([{ introduction: first, requester: "tinashe", status: "ACCEPTED" }]);
  expect((await post("/introductions/request", { listing }, chipo)).status).toBe(200);
});

test("a listing that is not confirmed in time leaves search and is withdrawn, not let", async () => {
  const dube = await register("mrsdube", "avondale-cottage");
  const tinashe = await register("tinashe", "mbare-2026");
  const { listing } = (await post("/listings/publish", cottage, dube)).body;

  expect((await post("/listings/search", { area: "avondale", maxRent: 200 })).body.results.listings).toHaveLength(1);

  now = new Date(now.getTime() + LISTING_LIFETIME_MS + 1);
  expect((await post("/listings/search", { area: "avondale", maxRent: 200 })).body.results.listings).toEqual([]);
  expect((await post("/introductions/request", { listing }, tinashe)).body).toEqual({ error: "CONFLICT" });
  expect((await post("/listings/view", { listing })).body.terms).toMatchObject({ status: "OPEN", current: false });

  await expireDue(application);
  expect((await post("/listings/mine", {}, dube)).body.mine.listings[0]).toMatchObject({
    listing,
    status: "WITHDRAWN",
    current: false,
  });
});
