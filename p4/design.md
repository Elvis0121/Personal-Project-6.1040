# p4 design

In this design doc, I'm comparing the changes that I moved through across the milestones.

How this ended up vs P1, and the one join that was still messy.

## vs p1

Listing / Introducing / Verifying / Expiring are still the same. What changed:

- `disclose` is a query (`_disclosed`), not an action. the page can only read through queries.
- Verifying is on the listing, not the person. `examine` became `_evidence`. files are not in the concept.
- `decidedBy` stays after revoke. moving a verified place drops VERIFIED, rent change does not.
- Expiring does not know what a listing is. withdraw automatically if not reconfirmed.
- no Photographing concept. photos sit next to Listing the same way proof files sit next to Verifying.
- Likes are `localStorage` and we don't make them a a concept.

Current specs: `[design/concepts/](https://github.com/Elvis0121/Personal-Project-6.1040/tree/412e61d3f92c926dba49e53985c1e0a70be8aa9a/design/concepts)`

## vs p3 visual

P3 slides were spice markets and old print, not a housing site. Type and colour came from that: Newsreader for headings, Source Sans 3 for the rest, cream page, teal for the thing you can do, paprika for decline, a slight oregano for VERIFIED, turmeric for pending. This final version is still using that.

In P4, mostly changed the hierarchy:

- We put one loud action, such that confirm stays teal even if someone is waiting. Accept / decline are the same small status font as PENDING used to be, green and paprika
- Photos are beneath Move in so the fold is not hidden under proof
- Requests is always a dropdown, empty or waiting, using mint green.
- Warnings are popups before every major action like mark let, withdraw, relist, remove photo, share your number. You can go ahead with an actioin that modifies the listing, or change its state.
- Landing safety uses real houses, not generated rooms
- Kumba still has Find your home and My homes. A reviewer needs to see the listing the way a tenant sees it, not only the bill in the queue.

## p4 changes

Multipart cannot go through the json policy, so photos and proof uploads had their own origin / session / owner / OPEN checks. Same rules, second copy. That's how you could still swap photos after mark-let.

Now there is one view, `OwnedOpen` (`the owner of open (listing)`).

- confirm uses it
- json submit-proof as well
- multipart photos / proof call `requireOwnedOpen` in `src/access.ts`, which is the same predicate, same origin list as the policy, same public error codes

Introductions still uses `OpenOwner` (open AND current). Asking about a lapsed place should fail even before it is withdrawn. Confirm / photos / proof only need OPEN.

Bytes are not in Verifying. They go in a `files.blobs` collection (and disk if it writes). So a new deploy machine still has the bill. Search still cannot see it.

## access (what i checked)

Session first on anything that writes. Listing's own `NOT_OWNER` for publish / let / edit / withdraw.

`OwnedOpen` (owner + OPEN) is the one join for confirm, submit-proof, and photos. That extra http door was copying those checks and got them wrong after mark-let ([412e61d](https://github.com/Elvis0121/Personal-Project-6.1040/commit/412e61d3f92c926dba49e53985c1e0a70be8aa9a)).

`OpenOwner` still wants current. You should not ask about a lapsed place.

Reviewer is a username (`kumba`), not a flag. Queue / `_evidence` / proof download all go through that. Search never has the bill or the number.

Sign out goes to `#/`. Guests can still open List a place; the form tells them to log in. `#/review` without an account goes home.

## tests for the additional door

- photo still serves after the disk file is gone. that's the reviewer `NOT_FOUND`. `tests/photo-http.test.ts`
- withdrawn listing cannot take photo writes. same `OwnedOpen` as let. `tests/photo-http.test.ts`
- owner cannot confirm after mark-let. confirm uses the view too. `tests/expire-http.test.ts`
- multipart proof after mark-let is CONFLICT, same as json. if access.ts only wrapped json, this should fails. `tests/proof-http.test.ts`
- guest cannot download proof. `tests/proof-http.test.ts`

If bytes only live on disk, the first one fails. If the extra http door still has its own owner check, the multipart one fails.

## summary

Same four concepts as P1. The page reads through queries. Files are next to Listing / Verifying, not in them. Likes stay in the browser.

The join that was still messy was the extra http door for photos and proof. It copied owner / OPEN / origin and got them wrong after mark-let. P4 makes that one view, `OwnedOpen`, and puts bytes in `files.blobs` so a new deploy machine still has the bill. Search still cannot see it.

Visual is still the P3 spice-market type and colour. P4 is where things sit, and that you get asked before a listing leaves search or someone gets your number.
