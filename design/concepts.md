# Concept design

> p1 snapshot. current specs (what the code actually implements — `bun run check` verifies them) are in [concepts/](concepts/).

4 main concepts:

- Listing
- Expiring
- Verifying
- Introducing

We will assume a standard UserAuthenticating concept (register and log in with a phone number + password) to identify users (but will not be specified here)

For reactions, `Requesting.x()` will stand for a request a logged-in user makes through the interface

## Concept specifications



### Listing

```
concept Listing [User]

purpose
  let people judge whether a place is worth pursuing by making
  its full terms visible while it is available; prevents having
  to pay to learn the full cost

principle
  after an owner publishes a listing stating where the place is,
  what kind of place it is, the rent, deposit, extra charges and
  move-in date, anyone can inspect those terms; once the owner
  marks the listing as let, it is no longer available

state
  a set of Listings with
    an owner User
    a location String
    a kind String
    a currency String
    a rent Number
    a deposit Number
    an extras String
    a moveIn Date
    a contact String
    a status of OPEN or LET or WITHDRAWN

actions
  publish (owner: User, location: String, kind: String,
           currency: String, rent: Number, deposit: Number,
           extras: String, moveIn: Date, contact: String)
    : (listing: Listing)
    where rent >= 0 and deposit >= 0 and contact is nonempty
    then create a listing with these fields and status OPEN;
         return it

  update (owner: User, listing: Listing, location: String,
          kind: String, currency: String, rent: Number,
          deposit: Number, extras: String, moveIn: Date,
          contact: String)
    where listing exists, its owner is owner, its status is OPEN,
          rent >= 0, deposit >= 0, and contact is nonempty
    then set the listing's fields to these values

  markLet (owner: User, listing: Listing)
    where listing exists, its owner is owner, and its status is OPEN
    then set its status to LET

  withdraw (owner: User, listing: Listing)
    where listing exists, its owner is owner, and its status is OPEN
    then set its status to WITHDRAWN

  relist (owner: User, listing: Listing)
    where listing exists, its owner is owner, and its status is
          LET or WITHDRAWN
    then set its status to OPEN

  inspect (listing: Listing)
    : (location: String, kind: String, currency: String,
       rent: Number, deposit: Number, extras: String,
       moveIn: Date, status: String)
    where listing exists
    then return these fields (but not contact)

notes
  The contact is the number to call about this place. It is part
  of the listing because a caretaker may give a different number
  from the one they log in with, but inspect never reveals it; it
  is released only through an introduction.

  Extras is free text ("water billed separately, US$20 security
  levy") rather than a list of charge types, to keep publishing quick.

  A landlord whose tenant falls through, or who withdrew a listing
  and wants it back, relists the same listing instead of publishing
  a new one. The place has not changed, so it keeps its verification
  and the landlord does not have to submit proof again.
```



### Expiring

```
concept Expiring [Resource]

purpose
  prevent stale claims of availability by requiring that they be
  reconfirmed periodically

principle
  after a resource is started with a duration, it is current until
  that duration passes; renewing it before then keeps it current;
  if nobody renews it in time, it expires and is no longer current

state
  a set of Timers with
    a unique resource Resource
    a deadline DateTime

actions
  start (resource: Resource, duration: Number)
    where resource has no timer
    then create a timer for resource with deadline now + duration

  reschedule (resource: Resource, duration: Number)
    where resource has a timer
    then set its deadline to now + duration

  renew (resource: Resource, duration: Number)
    where resource has a timer whose deadline is in the future
    then set its deadline to now + duration

  system expire (resource: Resource)
    where resource has a timer whose deadline has passed
    then delete its timer

  isCurrent (resource: Resource) : (current: Flag)
    then return true if resource has a timer whose deadline is in
         the future, and false otherwise

notes
  Expiring knows only about time. It does not know why a resource
  stopped being renewed, so it never says anything about whether a
  place was let.

  Durations are in seconds. The app uses 30 days.
```



### Verifying

```
concept Verifying [User, Subject]

purpose
  let others trust a subject without seeing the evidence behind
  it, by having a reviewer check that evidence; prevents trusting
  an unsupported claim

principle
  after an advertiser submits evidence about a subject, the
  reviewer examines it and either verifies or rejects it; anyone
  can then see whether the subject is verified, but only the
  reviewer ever sees the evidence

state
  a reviewers set of Users

  a set of Verifications with
    an advertiser User
    a subject Subject
    an evidence set of Strings
    a status of PENDING or VERIFIED or REJECTED

actions
  appoint (reviewer: User)
    where reviewers is empty
    then add reviewer to reviewers

  submit (advertiser: User, subject: Subject, evidence: set of String)
    : (verification: Verification)
    where evidence is nonempty and subject has no verification that
          is PENDING or VERIFIED
    then create a verification with these fields and status PENDING;
         return it

  examine (reviewer: User, verification: Verification)
    : (evidence: set of String)
    where reviewer is in reviewers
    then return the verification's evidence

  verify (reviewer: User, verification: Verification)
    where reviewer is in reviewers and its status is PENDING
    then set its status to VERIFIED

  reject (reviewer: User, verification: Verification)
    where reviewer is in reviewers and its status is PENDING
    then set its status to REJECTED

  revoke (subject: Subject)
    where subject has a VERIFIED verification
    then set that verification's status to REJECTED

  isVerified (subject: Subject) : (verified: Flag)
    then return true if subject has a VERIFIED verification, and
         false otherwise

notes
  old draft. current one is concepts/Verifying.md. evidence is one string
  now, `_evidence` is a query, files stay on disk, tenants still don't
  see them.
```

current Verifying: [concepts/Verifying.md](concepts/Verifying.md).

### Introducing

```
concept Introducing [User, Subject]

purpose
  keep a person's contact private until they agree to share it
  with a particular requester; prevents disclosing contact
  without that person's consent

principle
  a requester asks to be introduced to a holder about a subject;
  if the holder accepts, the requester can see the contact the
  holder supplied; if the holder declines, the requester never
  sees it

state
  a set of Introductions with
    a requester User
    a holder User
    a subject Subject
    a status of PENDING or ACCEPTED or DECLINED
    an optional contact String

actions
  request (requester: User, holder: User, subject: Subject)
    : (introduction: Introduction)
    where requester is not holder and requester has no
          introduction about subject
    then create an introduction with status PENDING and no contact;
         return it

  accept (holder: User, introduction: Introduction, contact: String)
    where introduction's holder is holder, its status is PENDING,
          and contact is nonempty
    then set its status to ACCEPTED and its contact to contact

  decline (holder: User, introduction: Introduction)
    where introduction's holder is holder and its status is PENDING
    then set its status to DECLINED

  disclose (requester: User, introduction: Introduction)
    : (contact: String)
    where introduction's requester is requester and its status
          is ACCEPTED
    then return its contact

  reset (subject: Subject)
    then delete every introduction about subject that is PENDING
         or DECLINED

notes
  potential tenant may request only one introduction per place, so a
  declined tenant cannot pester the landlord with repeat requests.
  reset gives everyone a fresh chance when the subject becomes
  available again, say when a listing is taken down and ten relisted. 
  Accepted introductions are kept, since those tenants already have 
  the contact
```



## Reactions

Parts of a reaction

When-: action or request that triggers a reaction

Where-: conditions on the state

Then-: names the action that follows

### Related to listings

```
reaction startTimerOnPublish
  when Listing.publish (): (listing)
  then Expiring.start (resource: listing, duration: 30 days)

reaction confirmStillAvailable
  when Requesting.confirmAvailable (user, listing)
  where in Listing: listing's owner is user and its status is OPEN
  then Expiring.renew (resource: listing, duration: 30 days)

reaction withdrawOnExpiry
  when Expiring.expire (resource: listing)
  where in Listing: listing's status is OPEN
  then Listing.withdraw (owner: listing's owner, listing)

reaction startTimerOnRelist
  when Listing.relist (listing)
  where in Expiring: listing has no timer
  then Expiring.start (resource: listing, duration: 30 days)

reaction rescheduleTimerOnRelist
  when Listing.relist (listing)
  where in Expiring: listing has a timer
  then Expiring.reschedule (resource: listing, duration: 30 days)

reaction resetIntroductionsOnRelist
  when Listing.relist (listing)
  then Introducing.reset (subject: listing)
```



### Verification

```
reaction submitProof
  when Requesting.submitProof (user, listing, evidence)
  where in Listing: listing's owner is user and its status is OPEN
  then Verifying.submit (advertiser: user, subject: listing, evidence)

reaction updateListing
  when Requesting.update (user, listing, location, kind, currency,
                          rent, deposit, extras, moveIn, contact)
  where in Listing: listing's owner is user and its status is OPEN
  then Listing.update (owner: user, listing, location, kind, currency,
                       rent, deposit, extras, moveIn, contact)

reaction revokeOnMove
  when Requesting.update (user, listing, location, kind, currency,
                          rent, deposit, extras, moveIn, contact)
  where in Listing: listing's owner is user, its status is OPEN,
                    and its location is not location
        in Verifying: listing is verified
  then Verifying.revoke (subject: listing)

reaction reviewOnlyByAdmin
  when Requesting.verify (user, verification)
  where in Verifying: user is in reviewers
  then Verifying.verify (reviewer: user, verification)
```

`_evidence`, `reject`, and an admin-requested `revoke` follow the same pattern as `reviewOnlyByAdmin`: the request is carried out only when the user is in Verifying's reviewers set. A location change does not use that check. `updateListing` applies the edit, and `revokeOnMove` clears verification when the location actually changed. The reviewer reads evidence through the `_evidence` query, not an `examine` action.

### Introductions and letting

```
reaction requestIntroduction
  when Requesting.requestIntroduction (user, listing)
  where in Listing: listing's status is OPEN
        in Expiring: listing is current
  then Introducing.request (requester: user,
                              holder: listing's owner,
                              subject: listing)

reaction acceptIntroduction
  when Requesting.acceptIntroduction (user, introduction)
  where in Introducing: introduction's subject is listing
        in Listing: listing's contact is c
  then Introducing.accept (holder: user, introduction, contact: c)

reaction markLet
  when Requesting.markLet (user, listing)
  then Listing.markLet (owner: user, listing)
```

Owner actions other than update (withdraw, mark as let, relist) do not need an extra access-control reaction. Each action's precondition requires that the owner is the requesting user, so other users cannot complete those atiosn. Update goes through `updateListing` because a location change also has to revoke verification.

`confirmStillAvailable` and `submitProof` have actions in other concepts so these reactions check ownership in Listing before they act

## Concepts in the app

**Listing** holds the terms a tenant reads and filters on, and each listing's open, let, or withdrawn status. The search page shows listings that are OPEN and current in Expiring, so a tenant never sees a place that is let, withdrawn, or unconfirmed for over 30 days. Listing does not know about time or verification. It does store a contact, and `inspect` never returns it. That contact is released only through Introducing.

**Expiring** has its `Resource` type bound to listings, and it tracks time. A landlord periodically confirms availability of a listing, which renews the timer. When the timer runs out, a reaction withdraws the listing, as opposed to marking it as let, so a lapsed listing is never reported as rented. Relisting calls `start` when no timer remains, and `reschedule` when one does.

**Verifying** has its `Subject` type bound to listings rather than landlords. A landlord with three places must show proof for each one, because owning one house says nothing about the next. Changing a listing's location revokes its verification, but relisting it does not, so a landlord whose tenant falls through never has to show proof again. The evidence is seen only by the reviewer. Tenants never see documents, only a VERIFIED label on search results and listing pages. That label is Kumba's own assurance that the advertiser can let the place, so the responsibility for checking sits with Kumba, not the tenant. Unverified listings are still shown, with an unverified label, and still accept introductions. The reviewer is the single user in Verifying's reviewers set, appointed when the app is deployed.

**Introducing** has its requester bound to tenants, its holder to the listing's owner, and its `Subject` to the listing. The holder's contact is copied from the listing when they accept. A tenant can only request an introduction for a listing that is open and current. Relisting clears pending and declined introductions, so every tenant can ask about a relisted place.

**UserAuthenticating** binds the `User` type in every concept.