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
- [User journey and what was checked](p3/user-journey.md)
- demo video: [https://youtu.be/AgoNLDelj1g?si=Qr14E2q150i2Sgq6](https://youtu.be/AgoNLDelj1g?si=Qr14E2q150i2Sgq6)

note: it is virtually IMPOSSIBLE to show the functionality of the app in under 2 minutes because of cookie sessions and the need to sign in to 3 different accounts, as can be attested from the video.



### What landed from the study

slides were from looking at spice markets and old print, not at kumba. then i took some of that into the ui:

- teal on buttons / links
- paprika only on errors
- oregano for VERIFIED, turmeric for pending
- cream page, dark type
- Newsreader for headings, Source Sans 3 for the rest

### Why files sit beside the concepts

didn't make a Photographing concept. a photo doesn't really *do* anything in the model, it just sits on a listing. same for proof files: if they lived in Verifying's state, they'd be one leaky query away from search.

so the bytes are just files on disk. Verifying only stores a string (kind / filename / note). reviewer opens the file through `_evidence`. tenants see VERIFIED. they never see Mrs Dube's rates bill.

photos are the same idea, extra http next to Listing. max 8. first one is the display photo.

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

`bun test` needs MongoDB running (`bun run db:up`). Each file opens a throwaway database, so it does not touch the app's data. Every concept has a test for its principle, plus tests for its refusals. A saved run is in [tests/bun-test-output.txt](tests/bun-test-output.txt).

- The landlord's number never leaks. Search results and listing details never include the contact. `_disclosed` answers it only to the requester of an accepted introduction.
- Only the right person can act. Only a listing's owner can mark it as let, withdraw it, confirm it, edit it, or relist it. Only the landlord who was asked can accept or decline a request. Only `kumba` sees proof and can verify it.
- Duplicate requests are refused. Two simultaneous requests about the same place produce one introduction.
- Relisting gives tenants a fresh chance. Pending and declined requests are cleared, and accepted ones are kept.
- A tenant sees VERIFIED after Kumba checks, and never the evidence. An unverified listing stays in search.
- A listing that is not confirmed in time leaves search and is withdrawn, not marked let.
- Passwords and sessions behave. Passwords are not stored as written. Sessions stop working when they are ended or expire.
- photos: same origin rule as the json api, and you can't change them after the place is let. that's in `tests/photo-http.test.ts`

`bun run check` confirms that the code matches the specifications in `design/` and that the generated API types are current.

Integration. [tests/journey.test.ts](tests/journey.test.ts) runs the journey through the real endpoints + cookie + mongo (search, VERIFIED, introduction, mark let, lapse). also access control and error cases. write-up of what i actually clicked is [p3/user-journey.md](p3/user-journey.md).

Limitations. Vue pages aren't in `bun test`. photos / multipart proof have their own http tests.

design notebook is in the private repo.



future improvements:

in the future, might add functionality to compare places so a tenant can pick between choices

also, can implement likes and reviews

change the name to "Bvisa Musondosi" which resonates more with people who are frustrated with middlemen