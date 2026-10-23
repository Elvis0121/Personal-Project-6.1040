# user journey testing (p3)

story is in [p2/user-journey.md](../p2/user-journey.md). automated journey is [tests/journey.test.ts](../tests/journey.test.ts). run `bun run db:up` then `bun test tests/journey.test.ts`.

this is HTTP + Mongo, not the Vue pages. won't open a browser.

saved `bun test` run: [tests/bun-test-output.txt](../tests/bun-test-output.txt).

## Automated tests cover the happy path

Happy path, `journey: a tenant finds a verified place, is introduced, and the landlord marks it let`

- Mrs Dube registers, publishes the Avondale cottage (full terms, her number stored).
- Tinashe searches Avondale under US$200 with no account required. He sees rent, deposit, extras. He never sees the number.
- The cottage is searchable before it is verified.
- She submits a rates-bill note. `kumba` reads the queue and verifies. Search and view then say VERIFIED. Still no bill, still no number.
- She confirms the listing is still current.
- He asks for an introduction. While pending he gets no number. She sees the request on My listings and accepts. Then he sees `0772 429 864`.
- She marks it let. It leaves search. A third person cannot ask about it.

Access, `access control: the session decides who acts, and only the right person can`

- No cookie, a made-up cookie, or a foreign Origin are refused. Sign-out, then `/listings/mine` is UNAUTHORIZED.
- A session stuffed in the JSON body is ignored.
- Tinashe cannot mark-let, confirm, withdraw, edit, or submit proof on her listing.
- She cannot request an introduction to herself. He cannot accept his own request. A second request is CONFLICT. After she declines, accept is refused and he still has no number.

Errors, `errors: bad input and unknown things answer with a clear category`

- Taken username, short username, wrong password.
- Blank contact, negative rent.
- Missing listing, missing introduction.
- Empty proof.

Other paths

- Relisting keeps accepted introductions, clears pending and declined, and lets a declined person ask again.
- If she does not confirm before the timer, the cottage leaves search, nobody can ask, and expire withdraws it. It is not marked let.

one thing that was easy to miss: photos don't go through the same handler as the json api, so origin/session could have been wrong there. also after you mark a place let you shouldn't still be able to swap photos. that's in [tests/photo-http.test.ts](../tests/photo-http.test.ts).

these other paths have also been walked on the local ui. live walk is below.

## Steps taken in a walk-through on the (live) UI

- [x] Guest landing, then Find your home, no account. Search. Open a listing. Number still hidden. Ask is behind log in.

  landing at first didn't show houses when logged out. fixed that, guests can look, still have to sign in to ask for an introduction.

- [ ] Sign up / sign in. Cookie survives a reload.

  live sign-in said "You are not allowed to do that". registering worked on localhost. PUBLIC_ORIGIN has to be https://kumba.mit-sdg.dev (no slash) and then it actually has to deploy. still finishing this on the live site.

- [x] List a place (signed out asks for an account; signed in publishes). Photos: upload, display photo, remove.
- [ ] Submit proof as a classified document (water bill, title deed, …). File reaches Review. Tenant never sees it.
- [ ] `kumba` verifies. Search shows VERIFIED. Reload. Still no evidence.
- [ ] Tenant asks. Landlord accepts. Number appears. Decline path once.
- [ ] Mark let. Listing gone from search. Relist. Confirm before 30 days.
- [ ] Liked places is local to this browser only.
- [ ] Someone else cannot edit, let, or see proof.
- [ ] A bad form (blank contact, negative rent) shows an error and does not publish.

## Unresolved

- Vue is not under `bun test`. photos and multipart proof are in `tests/photo-http.test.ts` / `tests/proof-http.test.ts`, not in the journey file.
- still need to finish the live ticks once the site is actually taking sign-in. video is separate.
- photos/proofs are files on disk. they'll vanish if the platform gives us a new machine. would need S3 later.
- note anything that breaks in the ui here when you walk it.
