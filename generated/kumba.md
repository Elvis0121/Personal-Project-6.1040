<!-- Generated from the Kumba assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Kumba — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Authenticating

Defined in [Authenticating](../design/concepts/Authenticating.md), line 1.

#### Actions

- `register(username: String, password: String) : returns (account: Account)`
  - Refuses `INVALID_USERNAME`: A username must contain 3 to 32 letters, numbers, underscores, or hyphens.
  - Refuses `WEAK_PASSWORD`: A password must contain 8 to 128 characters.
  - Refuses `USERNAME_TAKEN`: That username is already registered.
- `authenticate(username: String, password: String) : returns (account: Account)`
  - Refuses `INVALID_CREDENTIALS`: The username or password is incorrect.

#### Instances

- `Authenticating` — instance of `Authenticating` — [Kumba application types](../design/types.md), line 15.

### Introducing

Defined in [Introducing](../design/concepts/Introducing.md), line 1.

#### Actions

- `request(requester: User, holder: User, subject: Subject) : returns (introduction: Introduction)`
  - Refuses `SELF_INTRODUCTION`: You cannot ask to be introduced to yourself.
  - Refuses `ALREADY_REQUESTED`: You have already asked about this.
- `accept(holder: User, introduction: Introduction, contact: String) : returns (introduction: Introduction)`
  - Refuses `NO_SUCH_INTRODUCTION`: There is no such introduction.
  - Refuses `NOT_HOLDER`: Only the person who was asked can answer this request.
  - Refuses `ALREADY_ANSWERED`: This request has already been answered.
  - Refuses `MISSING_CONTACT`: A contact is needed to accept an introduction.
- `decline(holder: User, introduction: Introduction) : returns (introduction: Introduction)`
  - Refuses `NO_SUCH_INTRODUCTION`: There is no such introduction.
  - Refuses `NOT_HOLDER`: Only the person who was asked can answer this request.
  - Refuses `ALREADY_ANSWERED`: This request has already been answered.
- `reset(subject: Subject) : returns ()`

#### Queries

- `_get(introduction: Introduction) : optional (requester: User, holder: User, subject: Subject, status: Status)`
- `_mine(requester: User, subject: Subject) : optional (introduction: Introduction, status: Status)`
- `_disclosed(requester: User, subject: Subject) : optional (contact: String)`
- `_received(holder: User, subject: Subject) : many (introduction: Introduction, requester: User, status: Status)`

#### Instances

- `Introducing` — instance of `Introducing` — [Kumba application types](../design/types.md), line 23.
  - `Subject` is `Listing.Listing` — [Kumba application types](../design/types.md), line 25.
  - `User` is `Authenticating.Account` — [Kumba application types](../design/types.md), line 24.

### Listing

Defined in [Listing](../design/concepts/Listing.md), line 1.

#### Actions

- `publish(owner: User, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date, contact: String) : returns (listing: Listing)`
  - Refuses `INVALID_TERMS`: A listing needs a location, a kind of place, a currency, a move-in date, and a contact number.
  - Refuses `NEGATIVE_AMOUNT`: Rent and deposit cannot be negative.
- `update(owner: User, listing: Listing, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date, contact: String) : returns (listing: Listing)`
  - Refuses `NO_SUCH_LISTING`: There is no such listing.
  - Refuses `NOT_OWNER`: Only the advertiser can change this listing.
  - Refuses `NOT_OPEN`: This listing is not open.
  - Refuses `INVALID_TERMS`: A listing needs a location, a kind of place, a currency, a move-in date, and a contact number.
  - Refuses `NEGATIVE_AMOUNT`: Rent and deposit cannot be negative.
- `markLet(owner: User, listing: Listing) : returns (listing: Listing)`
  - Refuses `NO_SUCH_LISTING`: There is no such listing.
  - Refuses `NOT_OWNER`: Only the advertiser can change this listing.
  - Refuses `NOT_OPEN`: This listing is not open.
- `withdraw(owner: User, listing: Listing) : returns (listing: Listing)`
  - Refuses `NO_SUCH_LISTING`: There is no such listing.
  - Refuses `NOT_OWNER`: Only the advertiser can change this listing.
  - Refuses `NOT_OPEN`: This listing is not open.
- `relist(owner: User, listing: Listing) : returns (listing: Listing)`
  - Refuses `NO_SUCH_LISTING`: There is no such listing.
  - Refuses `NOT_OWNER`: Only the advertiser can change this listing.
  - Refuses `ALREADY_OPEN`: This listing is already open.

#### Queries

- `_search(area: String, maxRent: Number) : many (listing: Listing, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date)`
- `_get(listing: Listing) : optional (owner: User, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date, status: Status)`
- `_byOwner(owner: User) : many (listing: Listing, location: String, kind: String, currency: String, rent: Number, deposit: Number, extras: String, moveIn: Date, contact: String, status: Status)`
- `_contact(listing: Listing) : optional (contact: String)`

#### Instances

- `Listing` — instance of `Listing` — [Kumba application types](../design/types.md), line 20.
  - `User` is `Authenticating.Account` — [Kumba application types](../design/types.md), line 21.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `current(session: Session) : returns (subject: Subject)`
  - Refuses `UNKNOWN_SESSION`: You are not signed in, or your session has ended.
- `end(session: Session) : returns (ended: Flag)`
  - Refuses `UNKNOWN_SESSION`: You are not signed in, or your session has ended.

#### Instances

- `Sessioning` — instance of `Sessioning` — [Kumba application types](../design/types.md), line 17.
  - `Subject` is `Authenticating.Account` — [Kumba application types](../design/types.md), line 18.

### Verifying

Defined in [Verifying](../design/concepts/Verifying.md), line 1.

#### Actions

- `appoint(reviewer: User) : returns (reviewer: User)`
  - Refuses `INVALID_REVIEWER`: A reviewer needs a username.
  - Refuses `ALREADY_APPOINTED`: A reviewer has already been appointed.
- `submit(advertiser: User, subject: Subject, evidence: String) : returns (verification: Verification)`
  - Refuses `EMPTY_EVIDENCE`: Proof cannot be empty.
  - Refuses `ALREADY_CURRENT`: This already has proof waiting or verified.
- `verify(reviewer: User, verification: Verification) : returns (verification: Verification)`
  - Refuses `NOT_REVIEWER`: Only the appointed reviewer can decide this.
  - Refuses `NO_SUCH_VERIFICATION`: There is no such proof.
  - Refuses `NOT_PENDING`: This proof has already been decided.
- `reject(reviewer: User, verification: Verification) : returns (verification: Verification)`
  - Refuses `NOT_REVIEWER`: Only the appointed reviewer can decide this.
  - Refuses `NO_SUCH_VERIFICATION`: There is no such proof.
  - Refuses `NOT_PENDING`: This proof has already been decided.
- `revoke(subject: Subject) : returns ()`
  - Refuses `NOT_VERIFIED`: This is not verified.

#### Queries

- `_isReviewer(user: User) : one (appointed: Flag)`
- `_isVerified(subject: Subject) : one (verified: Flag)`
- `_forSubject(subject: Subject) : optional (verification: Verification, status: Status, decidedBy: User)`
- `_pending() : many (verification: Verification, advertiser: User, subject: Subject)`
- `_get(verification: Verification) : optional (advertiser: User, subject: Subject, status: Status, decidedBy: User)`
- `_evidence(reviewer: User, verification: Verification) : optional (evidence: String)`

#### Instances

- `Verifying` — instance of `Verifying` — [Kumba application types](../design/types.md), line 27.
  - `Subject` is `Listing.Listing` — [Kumba application types](../design/types.md), line 29.
  - `User` is `Authenticating.Account` — [Kumba application types](../design/types.md), line 28.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### the evidence of (verification) for reviewer (reviewer)

Authored path: `Review.Queue.ReviewerEvidence`.
- Covered by [Review](../design/compositions/Review.md), line 19.

```view
the evidence of (verification) for reviewer (reviewer) — inputs (verification, reviewer); outputs (evidence); bindings () — answers at most one (evidence)
  where Verifying._evidence (reviewer, verification) has (evidence)
```

### the owner of open (listing)

Authored path: `Introductions.Asking.OpenOwner`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 11.

```view
the owner of open (listing) — inputs (listing); outputs (owner); bindings () — answers at most one (owner)
  where Listing._get (listing) has (owner, status: "OPEN")
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the introduction (requester) has about (listing)

Authored path: `Introductions.Asking.MyIntroduction`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 23.

```former
Former "the introduction (requester) has about (listing)" — inputs (requester, listing); bindings (introduction, status, contact); promises exactly one record — forms:
  a record of
    where whether Introducing._mine (requester, subject: listing) has (introduction, status)
    where whether Introducing._disclosed (requester, subject: listing) has (contact)
    contact
    introduction
    status
```

### the listings of (owner)

Authored path: `Listings.Advertising.OwnListings`.
- Covered by [Listings](../design/compositions/Listings.md), line 38.

```former
Former "the listings of (owner)" — inputs (owner); bindings (listing, location, kind, currency, rent, deposit, extras, moveIn, contact, status, proof, introduction, requester, answer); promises exactly one record — forms:
  a record of
    listings: each Listing._byOwner (owner) has (contact, currency, deposit, extras, kind, listing, location, moveIn, rent, status)
      where whether Verifying._forSubject (subject: listing) has (status: proof)
      form a record of
        contact
        currency
        deposit
        extras
        kind
        listing
        location
        moveIn
        proof
        rent
        requests: each Introducing._received (holder: owner, subject: listing) has (introduction, requester, status: answer)
          form a record of
            introduction
            requester
            status: answer
        status
```

### the open listings in (area) up to (maxRent)

Authored path: `Listings.Searching.Results`.
- Covered by [Listings](../design/compositions/Listings.md), line 51.

```former
Former "the open listings in (area) up to (maxRent)" — inputs (area, maxRent); bindings (listing, location, kind, currency, rent, deposit, extras, moveIn, verified); promises exactly one record — forms:
  a record of
    listings: each Listing._search (area, maxRent) has (currency, deposit, extras, kind, listing, location, moveIn, rent)
      where Verifying._isVerified (subject: listing) has (verified)
      form a record of
        currency
        deposit
        extras
        kind
        listing
        location
        moveIn
        rent
        verified
```

### the pending proof for (reviewer)

Authored path: `Review.Queue.QueueItems`.
- Covered by [Review](../design/compositions/Review.md), line 17.

```former
Former "the pending proof for (reviewer)" — inputs (reviewer); bindings (verification, advertiser, subject, location, kind, currency, rent, deposit, extras, moveIn, status, evidence); promises exactly one record — forms:
  a record of
    items: each Verifying._pending () has (advertiser, subject, verification)
      where whether Listing._get (listing: subject) has (currency, deposit, extras, kind, location, moveIn, rent, status)
      where whether view "the evidence of (verification) for reviewer (reviewer)" with (reviewer, verification) has (evidence)
      form a record of
        advertiser
        currency
        deposit
        evidence
        extras
        kind
        listing: subject
        location
        moveIn
        rent
        status
        verification
```

### the terms of (listing)

Authored path: `Listings.Searching.Terms`.
- Covered by [Listings](../design/compositions/Listings.md), line 61.

```former
Former "the terms of (listing)" — inputs (listing); bindings (owner, location, kind, currency, rent, deposit, extras, moveIn, status, verified); promises at most one record — forms:
  a record of
    where Listing._get (listing) has (currency, deposit, extras, kind, location, moveIn, owner, rent, status)
    where Verifying._isVerified (subject: listing) has (verified)
    currency
    deposit
    extras
    kind
    listing
    location
    moveIn
    owner
    rent
    status
    verified
```

### whether (user) is the reviewer

Authored path: `Review.Access.AccessFlag`.
- Covered by [Review](../design/compositions/Review.md), line 9.

```former
Former "whether (user) is the reviewer" — inputs (user); bindings (appointed); promises exactly one record — forms:
  a record of
    where Verifying._isReviewer (user) has (appointed)
    appointed
```

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Introductions.Answering.Accept

Authored path: `Introductions.Answering.Accept`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 35.
- Covered by [Introductions](../design/compositions/Introductions.md), line 42.

```reaction
when RequestBoundary.request (introduction, path: "/introductions/accept", requestId, session)
then
  Sessioning.current (session)
```

### Introductions.Answering.Accept:known#2

Authored path: `Introductions.Answering.Accept`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 35.
- Covered by [Introductions](../design/compositions/Introductions.md), line 42.

```reaction
when Sessioning.current (session, subject: holder), asked by Introductions.Answering.Accept
where
  earlier, RequestBoundary.request (introduction, path: "/introductions/accept", requestId, session)
  Introducing._get (introduction) has (subject: listing)
  Listing._contact (listing) has (contact)
then
  Introducing.accept (contact, holder, introduction)
```

### Introductions.Answering.Accept:known#3

Authored path: `Introductions.Answering.Accept`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 35.
- Covered by [Introductions](../design/compositions/Introductions.md), line 42.

```reaction
when Introducing.accept (contact, holder, introduction), asked by Introductions.Answering.Accept:known#2
where
  earlier, RequestBoundary.request (introduction, path: "/introductions/accept", requestId, session)
then
  RequestBoundary.respond (introduction, requestId)
```

### Introductions.Answering.Accept:unknown#2

Authored path: `Introductions.Answering.Accept`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 35.
- Covered by [Introductions](../design/compositions/Introductions.md), line 42.

```reaction
when Sessioning.current (session, subject: holder), asked by Introductions.Answering.Accept
where
  earlier, RequestBoundary.request (introduction, path: "/introductions/accept", requestId, session)
  no Introducing._get (introduction)
then
  RequestBoundary.respond (error: "NO_SUCH_INTRODUCTION", requestId)
```

### Introductions.Answering.Decline

Authored path: `Introductions.Answering.Decline`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 38.
- Covered by [Introductions](../design/compositions/Introductions.md), line 43.

```reaction
when RequestBoundary.request (introduction, path: "/introductions/decline", requestId, session)
then
  Sessioning.current (session)
```

### Introductions.Answering.Decline#2

Authored path: `Introductions.Answering.Decline`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 38.
- Covered by [Introductions](../design/compositions/Introductions.md), line 43.

```reaction
when Sessioning.current (session, subject: holder), asked by Introductions.Answering.Decline
where
  earlier, RequestBoundary.request (introduction, path: "/introductions/decline", requestId, session)
then
  Introducing.decline (holder, introduction)
```

### Introductions.Answering.Decline#3

Authored path: `Introductions.Answering.Decline`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 38.
- Covered by [Introductions](../design/compositions/Introductions.md), line 43.

```reaction
when Introducing.decline (holder, introduction), asked by Introductions.Answering.Decline#2
where
  earlier, RequestBoundary.request (introduction, path: "/introductions/decline", requestId, session)
then
  RequestBoundary.respond (introduction, requestId)
```

### Introductions.Asking.Mine

Authored path: `Introductions.Asking.Mine`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 22.
- Covered by [Introductions](../design/compositions/Introductions.md), line 29.

```reaction
when RequestBoundary.request (listing, path: "/introductions/mine", requestId, session)
then
  Sessioning.current (session)
```

### Introductions.Asking.Mine#2

Authored path: `Introductions.Asking.Mine`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 22.
- Covered by [Introductions](../design/compositions/Introductions.md), line 29.

```reaction
when Sessioning.current (session, subject: requester), asked by Introductions.Asking.Mine
where
  earlier, RequestBoundary.request (listing, path: "/introductions/mine", requestId, session)
then
  RequestBoundary.respond (mine: former "the introduction (requester) has about (listing)" with (listing, requester), requestId)
```

### Introductions.Asking.Request

Authored path: `Introductions.Asking.Request`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 9.
- Covered by [Introductions](../design/compositions/Introductions.md), line 18.

```reaction
when RequestBoundary.request (listing, path: "/introductions/request", requestId, session)
then
  Sessioning.current (session)
```

### Introductions.Asking.Request:not-open#2

Authored path: `Introductions.Asking.Request`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 9.
- Covered by [Introductions](../design/compositions/Introductions.md), line 18.

```reaction
when Sessioning.current (session, subject: requester), asked by Introductions.Asking.Request
where
  earlier, RequestBoundary.request (listing, path: "/introductions/request", requestId, session)
  no view "the owner of open (listing)" with (listing)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### Introductions.Asking.Request:open#2

Authored path: `Introductions.Asking.Request`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 9.
- Covered by [Introductions](../design/compositions/Introductions.md), line 18.

```reaction
when Sessioning.current (session, subject: requester), asked by Introductions.Asking.Request
where
  earlier, RequestBoundary.request (listing, path: "/introductions/request", requestId, session)
  view "the owner of open (listing)" with (listing) has (owner)
then
  Introducing.request (holder: owner, requester, subject: listing)
```

### Introductions.Asking.Request:open#3

Authored path: `Introductions.Asking.Request`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 9.
- Covered by [Introductions](../design/compositions/Introductions.md), line 18.

```reaction
when Introducing.request (holder: owner, requester, subject: listing, introduction), asked by Introductions.Asking.Request:open#2
where
  earlier, RequestBoundary.request (listing, path: "/introductions/request", requestId, session)
then
  RequestBoundary.respond (introduction, requestId)
```

### Introductions.Reopening.ResetOnRelist

Authored path: `Introductions.Reopening.ResetOnRelist`.
- Covered by [Introductions](../design/compositions/Introductions.md), line 49.

```reaction
when Listing.relist (listing)
then
  Introducing.reset (subject: listing)
```

### Listings.Advertising.MarkLet

Authored path: `Listings.Advertising.MarkLet`.
- Covered by [Listings](../design/compositions/Listings.md), line 17.
- Covered by [Listings](../design/compositions/Listings.md), line 24.

```reaction
when RequestBoundary.request (listing, path: "/listings/mark-let", requestId, session)
then
  Sessioning.current (session)
```

### Listings.Advertising.MarkLet#2

Authored path: `Listings.Advertising.MarkLet`.
- Covered by [Listings](../design/compositions/Listings.md), line 17.
- Covered by [Listings](../design/compositions/Listings.md), line 24.

```reaction
when Sessioning.current (session, subject: owner), asked by Listings.Advertising.MarkLet
where
  earlier, RequestBoundary.request (listing, path: "/listings/mark-let", requestId, session)
then
  Listing.markLet (listing, owner)
```

### Listings.Advertising.MarkLet#3

Authored path: `Listings.Advertising.MarkLet`.
- Covered by [Listings](../design/compositions/Listings.md), line 17.
- Covered by [Listings](../design/compositions/Listings.md), line 24.

```reaction
when Listing.markLet (listing, owner), asked by Listings.Advertising.MarkLet#2
where
  earlier, RequestBoundary.request (listing, path: "/listings/mark-let", requestId, session)
then
  RequestBoundary.respond (listing, requestId)
```

### Listings.Advertising.Mine

Authored path: `Listings.Advertising.Mine`.
- Covered by [Listings](../design/compositions/Listings.md), line 37.
- Covered by [Listings](../design/compositions/Listings.md), line 44.

```reaction
when RequestBoundary.request (path: "/listings/mine", requestId, session)
then
  Sessioning.current (session)
```

### Listings.Advertising.Mine#2

Authored path: `Listings.Advertising.Mine`.
- Covered by [Listings](../design/compositions/Listings.md), line 37.
- Covered by [Listings](../design/compositions/Listings.md), line 44.

```reaction
when Sessioning.current (session, subject: owner), asked by Listings.Advertising.Mine
where
  earlier, RequestBoundary.request (path: "/listings/mine", requestId, session)
then
  RequestBoundary.respond (mine: former "the listings of (owner)" with (owner), requestId)
```

### Listings.Advertising.Publish

Authored path: `Listings.Advertising.Publish`.
- Covered by [Listings](../design/compositions/Listings.md), line 9.
- Covered by [Listings](../design/compositions/Listings.md), line 14.

```reaction
when RequestBoundary.request (contact, currency, deposit, extras, kind, location, moveIn, path: "/listings/publish", rent, requestId, session)
then
  Sessioning.current (session)
```

### Listings.Advertising.Publish#2

Authored path: `Listings.Advertising.Publish`.
- Covered by [Listings](../design/compositions/Listings.md), line 9.
- Covered by [Listings](../design/compositions/Listings.md), line 14.

```reaction
when Sessioning.current (session, subject: owner), asked by Listings.Advertising.Publish
where
  earlier, RequestBoundary.request (contact, currency, deposit, extras, kind, location, moveIn, path: "/listings/publish", rent, requestId, session)
then
  Listing.publish (contact, currency, deposit, extras, kind, location, moveIn, owner, rent)
```

### Listings.Advertising.Publish#3

Authored path: `Listings.Advertising.Publish`.
- Covered by [Listings](../design/compositions/Listings.md), line 9.
- Covered by [Listings](../design/compositions/Listings.md), line 14.

```reaction
when Listing.publish (contact, currency, deposit, extras, kind, location, moveIn, owner, rent, listing), asked by Listings.Advertising.Publish#2
where
  earlier, RequestBoundary.request (contact, currency, deposit, extras, kind, location, moveIn, path: "/listings/publish", rent, requestId, session)
then
  RequestBoundary.respond (listing, requestId)
```

### Listings.Advertising.Relist

Authored path: `Listings.Advertising.Relist`.
- Covered by [Listings](../design/compositions/Listings.md), line 18.
- Covered by [Listings](../design/compositions/Listings.md), line 25.

```reaction
when RequestBoundary.request (listing, path: "/listings/relist", requestId, session)
then
  Sessioning.current (session)
```

### Listings.Advertising.Relist#2

Authored path: `Listings.Advertising.Relist`.
- Covered by [Listings](../design/compositions/Listings.md), line 18.
- Covered by [Listings](../design/compositions/Listings.md), line 25.

```reaction
when Sessioning.current (session, subject: owner), asked by Listings.Advertising.Relist
where
  earlier, RequestBoundary.request (listing, path: "/listings/relist", requestId, session)
then
  Listing.relist (listing, owner)
```

### Listings.Advertising.Relist#3

Authored path: `Listings.Advertising.Relist`.
- Covered by [Listings](../design/compositions/Listings.md), line 18.
- Covered by [Listings](../design/compositions/Listings.md), line 25.

```reaction
when Listing.relist (listing, owner), asked by Listings.Advertising.Relist#2
where
  earlier, RequestBoundary.request (listing, path: "/listings/relist", requestId, session)
then
  RequestBoundary.respond (listing, requestId)
```

### Listings.Advertising.SubmitProof

Authored path: `Listings.Advertising.SubmitProof`.
- Covered by [Listings](../design/compositions/Listings.md), line 28.
- Covered by [Listings](../design/compositions/Listings.md), line 34.

```reaction
when RequestBoundary.request (evidence, listing, path: "/listings/submit-proof", requestId, session)
then
  Sessioning.current (session)
```

### Listings.Advertising.SubmitProof:missing#2

Authored path: `Listings.Advertising.SubmitProof`.
- Covered by [Listings](../design/compositions/Listings.md), line 28.
- Covered by [Listings](../design/compositions/Listings.md), line 34.

```reaction
when Sessioning.current (session, subject: advertiser), asked by Listings.Advertising.SubmitProof
where
  earlier, RequestBoundary.request (evidence, listing, path: "/listings/submit-proof", requestId, session)
  no Listing._get (listing)
then
  RequestBoundary.respond (error: "NO_SUCH_LISTING", requestId)
```

### Listings.Advertising.SubmitProof:not-open#2

Authored path: `Listings.Advertising.SubmitProof`.
- Covered by [Listings](../design/compositions/Listings.md), line 28.
- Covered by [Listings](../design/compositions/Listings.md), line 34.

```reaction
when Sessioning.current (session, subject: advertiser), asked by Listings.Advertising.SubmitProof
where
  earlier, RequestBoundary.request (evidence, listing, path: "/listings/submit-proof", requestId, session)
  Listing._get (listing) has (owner: advertiser) and not (status: "OPEN")
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### Listings.Advertising.SubmitProof:not-owner#2

Authored path: `Listings.Advertising.SubmitProof`.
- Covered by [Listings](../design/compositions/Listings.md), line 28.
- Covered by [Listings](../design/compositions/Listings.md), line 34.

```reaction
when Sessioning.current (session, subject: advertiser), asked by Listings.Advertising.SubmitProof
where
  earlier, RequestBoundary.request (evidence, listing, path: "/listings/submit-proof", requestId, session)
  Listing._get (listing) and not (owner: advertiser)
then
  RequestBoundary.respond (error: "NOT_OWNER", requestId)
```

### Listings.Advertising.SubmitProof:owner-open#2

Authored path: `Listings.Advertising.SubmitProof`.
- Covered by [Listings](../design/compositions/Listings.md), line 28.
- Covered by [Listings](../design/compositions/Listings.md), line 34.

```reaction
when Sessioning.current (session, subject: advertiser), asked by Listings.Advertising.SubmitProof
where
  earlier, RequestBoundary.request (evidence, listing, path: "/listings/submit-proof", requestId, session)
  Listing._get (listing) has (owner: advertiser, status: "OPEN")
then
  Verifying.submit (advertiser, evidence, subject: listing)
```

### Listings.Advertising.SubmitProof:owner-open#3

Authored path: `Listings.Advertising.SubmitProof`.
- Covered by [Listings](../design/compositions/Listings.md), line 28.
- Covered by [Listings](../design/compositions/Listings.md), line 34.

```reaction
when Verifying.submit (advertiser, evidence, subject: listing, verification), asked by Listings.Advertising.SubmitProof:owner-open#2
where
  earlier, RequestBoundary.request (evidence, listing, path: "/listings/submit-proof", requestId, session)
then
  RequestBoundary.respond (requestId, verification)
```

### Listings.Searching.Search

Authored path: `Listings.Searching.Search`.
- Covered by [Listings](../design/compositions/Listings.md), line 49.
- Covered by [Listings](../design/compositions/Listings.md), line 57.

```reaction
when RequestBoundary.request (area, maxRent, path: "/listings/search", requestId)
then
  RequestBoundary.respond (requestId, results: former "the open listings in (area) up to (maxRent)" with (area, maxRent))
```

### Listings.Searching.View:found

Authored path: `Listings.Searching.View`.
- Covered by [Listings](../design/compositions/Listings.md), line 60.
- Covered by [Listings](../design/compositions/Listings.md), line 67.

```reaction
when RequestBoundary.request (listing, path: "/listings/view", requestId)
where
  Listing._get (listing)
then
  RequestBoundary.respond (requestId, terms: former "the terms of (listing)" with (listing))
```

### Listings.Searching.View:missing

Authored path: `Listings.Searching.View`.
- Covered by [Listings](../design/compositions/Listings.md), line 60.
- Covered by [Listings](../design/compositions/Listings.md), line 67.

```reaction
when RequestBoundary.request (listing, path: "/listings/view", requestId)
where
  no Listing._get (listing)
then
  RequestBoundary.respond (error: "NO_SUCH_LISTING", requestId)
```

### Review.Access.Access

Authored path: `Review.Access.Access`.
- Covered by [Review](../design/compositions/Review.md), line 8.
- Covered by [Review](../design/compositions/Review.md), line 13.

```reaction
when RequestBoundary.request (path: "/review/access", requestId, session)
then
  Sessioning.current (session)
```

### Review.Access.Access#2

Authored path: `Review.Access.Access`.
- Covered by [Review](../design/compositions/Review.md), line 8.
- Covered by [Review](../design/compositions/Review.md), line 13.

```reaction
when Sessioning.current (session, subject: user), asked by Review.Access.Access
where
  earlier, RequestBoundary.request (path: "/review/access", requestId, session)
then
  RequestBoundary.respond (access: former "whether (user) is the reviewer" with (user), requestId)
```

### Review.Deciding.Reject

Authored path: `Review.Deciding.Reject`.
- Covered by [Review](../design/compositions/Review.md), line 28.
- Covered by [Review](../design/compositions/Review.md), line 33.

```reaction
when RequestBoundary.request (path: "/review/reject", requestId, session, verification)
then
  Sessioning.current (session)
```

### Review.Deciding.Reject#2

Authored path: `Review.Deciding.Reject`.
- Covered by [Review](../design/compositions/Review.md), line 28.
- Covered by [Review](../design/compositions/Review.md), line 33.

```reaction
when Sessioning.current (session, subject: reviewer), asked by Review.Deciding.Reject
where
  earlier, RequestBoundary.request (path: "/review/reject", requestId, session, verification)
then
  Verifying.reject (reviewer, verification)
```

### Review.Deciding.Reject#3

Authored path: `Review.Deciding.Reject`.
- Covered by [Review](../design/compositions/Review.md), line 28.
- Covered by [Review](../design/compositions/Review.md), line 33.

```reaction
when Verifying.reject (reviewer, verification), asked by Review.Deciding.Reject#2
where
  earlier, RequestBoundary.request (path: "/review/reject", requestId, session, verification)
then
  RequestBoundary.respond (requestId, verification)
```

### Review.Deciding.Verify

Authored path: `Review.Deciding.Verify`.
- Covered by [Review](../design/compositions/Review.md), line 27.
- Covered by [Review](../design/compositions/Review.md), line 32.

```reaction
when RequestBoundary.request (path: "/review/verify", requestId, session, verification)
then
  Sessioning.current (session)
```

### Review.Deciding.Verify#2

Authored path: `Review.Deciding.Verify`.
- Covered by [Review](../design/compositions/Review.md), line 27.
- Covered by [Review](../design/compositions/Review.md), line 32.

```reaction
when Sessioning.current (session, subject: reviewer), asked by Review.Deciding.Verify
where
  earlier, RequestBoundary.request (path: "/review/verify", requestId, session, verification)
then
  Verifying.verify (reviewer, verification)
```

### Review.Deciding.Verify#3

Authored path: `Review.Deciding.Verify`.
- Covered by [Review](../design/compositions/Review.md), line 27.
- Covered by [Review](../design/compositions/Review.md), line 32.

```reaction
when Verifying.verify (reviewer, verification), asked by Review.Deciding.Verify#2
where
  earlier, RequestBoundary.request (path: "/review/verify", requestId, session, verification)
then
  RequestBoundary.respond (requestId, verification)
```

### Review.Queue.Queue

Authored path: `Review.Queue.Queue`.
- Covered by [Review](../design/compositions/Review.md), line 16.
- Covered by [Review](../design/compositions/Review.md), line 24.

```reaction
when RequestBoundary.request (path: "/review/queue", requestId, session)
then
  Sessioning.current (session)
```

### Review.Queue.Queue:not-reviewer#2

Authored path: `Review.Queue.Queue`.
- Covered by [Review](../design/compositions/Review.md), line 16.
- Covered by [Review](../design/compositions/Review.md), line 24.

```reaction
when Sessioning.current (session, subject: reviewer), asked by Review.Queue.Queue
where
  Verifying._isReviewer (user: reviewer) has (appointed: false)
  earlier, RequestBoundary.request (path: "/review/queue", requestId, session)
then
  RequestBoundary.respond (error: "NOT_REVIEWER", requestId)
```

### Review.Queue.Queue:reviewer#2

Authored path: `Review.Queue.Queue`.
- Covered by [Review](../design/compositions/Review.md), line 16.
- Covered by [Review](../design/compositions/Review.md), line 24.

```reaction
when Sessioning.current (session, subject: reviewer), asked by Review.Queue.Queue
where
  Verifying._isReviewer (user: reviewer) has (appointed: true)
  earlier, RequestBoundary.request (path: "/review/queue", requestId, session)
then
  RequestBoundary.respond (queue: former "the pending proof for (reviewer)" with (reviewer), requestId)
```

### Sessions.CurrentAccount.CurrentUser

Authored path: `Sessions.CurrentAccount.CurrentUser`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 17.
- Covered by [Sessions](../design/compositions/Sessions.md), line 22.

```reaction
when RequestBoundary.request (path: "/auth/current", requestId, session)
then
  Sessioning.current (session)
```

### Sessions.CurrentAccount.CurrentUser#2

Authored path: `Sessions.CurrentAccount.CurrentUser`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 17.
- Covered by [Sessions](../design/compositions/Sessions.md), line 22.

```reaction
when Sessioning.current (session, subject: account), asked by Sessions.CurrentAccount.CurrentUser
where
  earlier, RequestBoundary.request (path: "/auth/current", requestId, session)
then
  RequestBoundary.respond (account, requestId)
```

### Sessions.EnteringApplication.Register

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  Authenticating.register (password, username)
```

### Sessions.EnteringApplication.Register#2

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.

```reaction
when Authenticating.register (password, username, account), asked by Sessions.EnteringApplication.Register
then
  Sessioning.start (subject: account)
```

### Sessions.EnteringApplication.Register#3

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by Sessions.EnteringApplication.Register#2
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### Sessions.EnteringApplication.SignIn

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 8.
- Covered by [Sessions](../design/compositions/Sessions.md), line 14.

```reaction
when RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  Authenticating.authenticate (password, username)
```

### Sessions.EnteringApplication.SignIn#2

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 8.
- Covered by [Sessions](../design/compositions/Sessions.md), line 14.

```reaction
when Authenticating.authenticate (password, username, account), asked by Sessions.EnteringApplication.SignIn
then
  Sessioning.start (subject: account)
```

### Sessions.EnteringApplication.SignIn#3

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 8.
- Covered by [Sessions](../design/compositions/Sessions.md), line 14.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by Sessions.EnteringApplication.SignIn#2
where
  earlier, RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### Sessions.LeavingApplication.SignOut

Authored path: `Sessions.LeavingApplication.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 25.
- Covered by [Sessions](../design/compositions/Sessions.md), line 29.

```reaction
when RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  Sessioning.end (session)
```

### Sessions.LeavingApplication.SignOut#2

Authored path: `Sessions.LeavingApplication.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 25.
- Covered by [Sessions](../design/compositions/Sessions.md), line 29.

```reaction
when Sessioning.end (session, ended), asked by Sessions.LeavingApplication.SignOut
where
  earlier, RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  RequestBoundary.respond (ended, requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/auth/current` — requires `session`
- `/auth/register` — requires `username`, `password`
- `/auth/sign-in` — requires `username`, `password`
- `/auth/sign-out` — requires `session`
- `/introductions/accept` — requires `session`, `introduction`
- `/introductions/decline` — requires `session`, `introduction`
- `/introductions/mine` — requires `session`, `listing`
- `/introductions/request` — requires `session`, `listing`
- `/listings/mark-let` — requires `session`, `listing`
- `/listings/mine` — requires `session`
- `/listings/publish` — requires `session`, `location`, `kind`, `currency`, `rent`, `deposit`, `extras`, `moveIn`, `contact`
- `/listings/relist` — requires `session`, `listing`
- `/listings/search` — requires `area`, `maxRent`
- `/listings/submit-proof` — requires `session`, `listing`, `evidence`
- `/listings/view` — requires `listing`
- `/review/access` — requires `session`
- `/review/queue` — requires `session`
- `/review/reject` — requires `session`, `verification`
- `/review/verify` — requires `session`, `verification`
