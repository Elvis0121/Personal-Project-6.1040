# Introductions

A tenant reaches a landlord only through an introduction the landlord accepts.
The landlord's number travels from the listing to the tenant at that moment and
no earlier.

## Asking

A signed-in tenant [asks to be introduced](reaction:Introductions.Asking.Request)
to the owner of a listing. The request is made only while the listing is open and current,
using [the owner of an open current listing](view:Introductions.Asking.OpenOwner); a
let, withdrawn, lapsed, or unknown listing answers `NOT_OPEN`. The requester is the
session's account and the holder is the listing's owner, so a tenant cannot
choose whom they are asking. Introducing refuses a second request about the same
listing and a request about one's own listing.

```endpoints
Introductions.Asking.Request at /introductions/request
```

On the listing page, a tenant sees
[their own introduction](reaction:Introductions.Asking.Mine) for that listing:
[its status, and the contact once it is accepted](former:Introductions.Asking.MyIntroduction).
Before the tenant asks, every field is blank. The contact comes from
Introducing's disclosed contact, which exists only for the requester's own
accepted introduction.

```endpoints
Introductions.Asking.Mine at /introductions/mine
```

## Answering

Only the landlord who was asked can answer. When they
[accept](reaction:Introductions.Answering.Accept), the contact copied into the
introduction is the one on the listing it is about, so the landlord does not
retype their number and a tenant never sees a number for a different place.
They can also [decline](reaction:Introductions.Answering.Decline), and the
tenant never sees the number.

```endpoints
Introductions.Answering.Accept at /introductions/accept
Introductions.Answering.Decline at /introductions/decline
```

## Relisting

When a landlord relists a place, every tenant should be able to ask about it
again. [Relisting a listing resets its introductions](reaction:Introductions.Reopening.ResetOnRelist),
which removes pending and declined requests and keeps the accepted ones, since
those tenants already have the number.
