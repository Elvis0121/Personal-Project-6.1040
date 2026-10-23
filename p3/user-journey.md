# user journey testing (p3)

story is in [p2/user-journey.md](../p2/user-journey.md). Automated journey i [tests/journey.test.ts](../tests/journey.test.ts). Run `bun run db:up` then `bun test tests/journey.test.ts`.

This is HTTP + Mongo, not the Vue pages. Won't open p in browser

## automated tests cover happy path

Happy path, `journey: a tenant finds a verified place, is introduced, and the landlord marks it let`

- Mrs Dube registers, publishes the Avondale cottage (full terms, her number stored).
- Tinashe searches Avondale under US$200 with no account required. He sees rent, deposit, extras. He never sees the number.
- The cottage is searchable before it is verified.
- She submits a rates-bill note. `kumba` reads the queue and verifies. Search and view then say VERIFIED. Still no bill, still no number.
- She confirms the listing is still current.
- He asks for an introduction. While pending he gets no number. She sees the request on My listings and accepts. Then he sees `0772 429 864`.
- She marks it let. It leaves search. A third person cannot ask about it.

Access, `access control: the session decides who acts, and only the right person can`

- No cookie, a made-up cookie, or a foreign Origin are refused.
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

these alternative paths have also ben  tested on the UI

## steps taken in a walk through on (live) ui

- [x] Guest landing, then Find your home, no account. Search. Open a listing. Number still hidden. Ask is behind log in.

- this initially failed -> the landing page could not serve the lookup functionality
  ```
     -fixed and re-ran and the landing page showed available houses even when logged out. Needed to sign in to request an introduction
  ```

- [ ] Sign up / sign in. Cookie survives a reload.

```
  - sign in said "You are not allowed to do that". Registering worked on local host. Added PUBLIC_ORIGIN to Environment variables
```

- [x] List a place (signed out asks for an account; signed in publishes). Photos: upload, display photo, remove.
- [ ] Submit proof as a classified document (water bill, title deed, …). File reaches Review. Tenant never sees it.
- [ ] `kumba` verifies. Search shows VERIFIED. Reload. Still no evidence.
- [ ] Tenant asks. Landlord accepts. Number appears. Decline path once.
- [ ] Mark let. Listing gone from search. Relist. Confirm before 30 days.
- [ ] Liked places is local to this browser only.
- [ ] Someone else cannot edit, let, or see proof.
- [ ] A bad form (blank contact, negative rent) shows an error and does not publish.



## Unresolved

- Vue is not under `bun test`. Photos and multipart proof are covered in `tests/photo-http.test.ts` and `tests/proof-http.test.ts`, not in `journey.test.ts`.
- Live click-through and the ≤2 min recording are still outstanding.
- Note anything that breaks in the UI here when you walk it.

