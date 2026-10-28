# Personal-Project-6.1040

A rental platform for Zimbabwe that takes a tenant from search to tenancy: find a place with its full costs shown up front, connect directly with the landlord, and rent it, without paying middlemen for access along the way.

This is being built as a real product for real tenants and landlords, starting in Harare.

Live app: [https://kumba.mit-sdg.dev](https://kumba.mit-sdg.dev)

## P1: Design

- [Problem framing](design/problem-framing.md)
- [Pitch](design/pitch.md)
- [Concept specifications](design/concepts.md)
- [UI sketches](design/ui-sketches.md)
- [User journey](design/user-journey.md)



## P2: Alpha (MVP)

- [Core user journey](p2/user-journey.md)
- Concept specs: [Authenticating](design/concepts/Authenticating.md), [Sessioning](design/concepts/Sessioning.md), [Listing](design/concepts/Listing.md), [Introducing](design/concepts/Introducing.md)
- [Application types](design/types.md)
- Compositions: [Sessions](design/compositions/Sessions.md), [Listings](design/compositions/Listings.md), [Introductions](design/compositions/Introductions.md)
- [Demo video](https://youtu.be/vbYU4Ed9J8E)



## P3: Beta

- Visual study: [colour](design/visual-study/01-colour.png), [type](design/visual-study/02-type.png)
- [user journey testing](p3/user-journey.md)
- demo video: [https://youtu.be/AgoNLDelj1g?si=Qr14E2q150i2Sgq6](https://youtu.be/AgoNLDelj1g?si=Qr14E2q150i2Sgq6)

note: it is virtually IMPOSSIBLE to show the functionality of the app in under 2 minutes because of cookie sessions and the need to sign in to 3 different accounts, as can be attested from the video.

slides were from looking at spice markets and old print, not at kumba. then i took some of that into the ui:

## P4: Code complete

- [design document](p4/design.md)
- live app: [https://kumba.mit-sdg.dev](https://kumba.mit-sdg.dev)
- demo video: [https://youtu.be/K8YaDxiBabE](https://youtu.be/K8YaDxiBabE) 

- teal on buttons / links
- paprika only on errors
- oregano for VERIFIED, turmeric for pending
- cream page, dark type
- Newsreader for headings, Source Sans 3 for the rest

didn't make a Photographing concept. a photo just sits on a listing. if proof files lived in Verifying they'd show up on search the second a query leaked.

bytes go in `files.blobs` (and disk if it writes). Verifying only stores a string (kind / filename / note). reviewer opens the file through `_evidence`. tenants see VERIFIED, not the rates bill.

photos: extra http next to Listing. max 8. first one is the display photo.

### Running locally

Needs Bun and Podman.

```sh
bun install
cp .env.example .env
bun run db:up    # MongoDB in Podman; tests and the app both need it
bun run dev      # backend on :3000, frontend on http://127.0.0.1:8080
bun test         # concept, HTTP, and journey tests (throwaway databases)
bun run check    # design, generated files, and types
```

Open the app at exactly [http://127.0.0.1:8080](http://127.0.0.1:8080) (not localhost), so the session cookie works.

reviewer account is `kumba` (see `.env.example`). on the live app, `PUBLIC_ORIGIN` has to be `https://kumba.mit-sdg.dev` or sign-in just says you're not allowed.

### Tests

need mongo up (`bun run db:up`) then `bun test`. each file uses a throwaway database so it doesnt touch the real one. saved output: [tests/bun-test-output.txt](tests/bun-test-output.txt).

every concept has a principle test + the refusals. also http tests for edit, expiry, review, photos, proof.

- search/view never include the landlords number. `_disclosed` only after accept, and only to that tenant
- tinashe cant let / confirm / edit mrs dube's listing. only `kumba` sees proof
- two requests at the same time, one introduction
- relist clears pending and declined, keeps accepted
- after kumba verifies, search says VERIFIED but still no bill. unverified listings still show
- dont confirm in time → leaves search, withdrawn, not marked let
- password isnt stored as written. sign-out then mine is UNAUTHORIZED
- photos go through a different handler than the json api so origin + "cant change after let" is in `tests/photo-http.test.ts`

`bun run check` = specs, code, generated types agree.

[tests/journey.test.ts](tests/journey.test.ts) is the long path (endpoints + cookie + mongo). clicks are in [p3/user-journey.md](p3/user-journey.md). vue isnt in bun test.

future improvements:

in the future, might add functionality to compare places so a tenant can pick between choices

also, can implement likes and reviews

change the name to "Bvisa Musondosi" which resonates more with people who are frustrated with middlemen