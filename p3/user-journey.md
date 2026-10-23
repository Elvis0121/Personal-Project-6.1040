# user journey testing (p3)

story is in [p2/user-journey.md](../p2/user-journey.md). automated journey is [tests/journey.test.ts](../tests/journey.test.ts). run `bun run db:up` then `bun test tests/journey.test.ts`.

this is HTTP + Mongo, not the Vue pages. won't open a browser.

saved `bun test` run: [tests/bun-test-output.txt](../tests/bun-test-output.txt).

## automated tests

[tests/journey.test.ts](../tests/journey.test.ts)

happy path `journey: a tenant finds a verified place, is introduced, and the landlord marks it let`. mrs dube publishes the avondale cottage (number stored). tinashe searches avondale under $200 with no account, sees rent/deposit/extras, not the number. listing is in search before its verified. she submits a rates bill, kumba verifies, search says VERIFIED, still no bill. he asks, while pending he has no number, she accepts, then he sees `0772 429 864`. she marks it let, it leaves search, third person cant ask.

access `access control: the session decides who acts...`. no cookie, fake cookie, wrong Origin all refused. session in the json body is ignored. sign-out then `/listings/mine` is UNAUTHORIZED. tinashe cant let/confirm/withdraw/edit/submit proof on hers. she cant request herself. he cant accept his own. second request is CONFLICT. after decline, accept is refused and he still has no number.

errors: taken username, short username, wrong password, blank contact, negative rent, missing listing, missing intro, empty proof.

other: relist keeps accepted intros, clears pending/declined. if she doesnt confirm in time it leaves search and expire withdraws it (not let).

photos dont go thru the json handler. origin + cant swap after let is in [tests/photo-http.test.ts](../tests/photo-http.test.ts).

## Steps taken in a walk-through on the (live) UI

- [x] Guest landing, then Find your home, no account. Search. Open a listing. Number still hidden. Ask is behind log in.
  ```
  landing at first didn't show houses when logged out. fixed that, guests can look, still have to sign in to ask for an introduction.
  ```

- [x] Sign up / sign in. Cookie survives a reload.
  `live sign-in said "You are not allowed to do that". registering worked on localhost. PUBLIC_ORIGIN has to be https://kumba.mit-sdg.dev  and then it actually has to deploy. still finishing this on the live site. App fixed at backend by TA (Barish)`

- [x] List a place (signed out asks for an account; signed in publishes). Photos: upload, display photo, remove.
- [x] Submit proof as a classified document (water bill, title deed, …). File reaches Review. Tenant never sees it.
- [x] `kumba` verifies. Search shows VERIFIED. Reload. Still no evidence.
- [x] Tenant asks. Landlord accepts. Number appears. Decline path once.
- [x] Mark let. Listing gone from search. Relist. Confirm before 30 days.
- [ ] Liked places is local to this browser only.
- [x] Someone else cannot edit, let, or see proof.
- [x] shoudn't be able to put negative amounts. in the form

- vue pages arent in bun test. photos + multipart proof live in `tests/photo-http.test.ts` / `tests/proof-http.test.ts`, not the journey file.

-still need to finish ui when app is back up

- photos/proofs are files on disk. they'll vanish if the platform gives us a new machine. would need S3 later.

-make video