# Verifying

## Purpose

Let others trust a subject without seeing the evidence behind it, by having a
reviewer check that evidence; prevents trusting an unsupported claim, or
exposing the evidence itself.

## Principle

Mrs Dube submits a rates bill reference about her Avondale cottage. Until a
reviewer decides, the cottage is not verified. Admin `kumba` reads the evidence,
which no tenant can, and verifies it. Search then labels the cottage VERIFIED,
still without the bill. If `kumba` later discovers the bill was false, the
verification still names `kumba` as the person who decided. After a rejection,
Mrs Dube may submit again. After the cottage is verified, a revoke (for example
because it moved) marks it unverified without erasing who had verified it.

## Types

```types
external User
  An advertiser who submits evidence, or a reviewer who judges it.

external Subject
  What the evidence is about, such as a place to let.

Status is PENDING or VERIFIED or REJECTED
  Whether a reviewer has decided, and how.
```

## State

```state
a set of Appointed Users
  Rule: appoint succeeds only while this set is empty, so there is at most one reviewer

a set of Verifications with
  an advertiser User
  a subject Subject
  an evidence String
  a status Status
  an optional decidedBy User
  Rule: a verification has a decidedBy exactly when its status is not PENDING
  Rule: revoke must not clear decidedBy
```

## Actions

```actions
appoint (reviewer: User) : returns (reviewer: User)
  where reviewer is blank
  then
    refuses INVALID_REVIEWER "A reviewer needs a username."
  where a reviewer is already appointed
  then
    refuses ALREADY_APPOINTED "A reviewer has already been appointed."
  where no reviewer is appointed and reviewer is not blank
  then
    add reviewer to Appointed Users
    returns reviewer

submit (advertiser: User, subject: Subject, evidence: String) : returns (verification: Verification)
  where evidence is blank
  then
    refuses EMPTY_EVIDENCE "Proof cannot be empty."
  where subject already has a verification that is PENDING or VERIFIED
  then
    refuses ALREADY_CURRENT "This already has proof waiting or verified."
  where evidence is not blank and subject has no PENDING or VERIFIED verification
  then
    add a new verification with advertiser, subject, evidence, status PENDING, and no decidedBy
    returns verification

verify (reviewer: User, verification: Verification) : returns (verification: Verification)
  where reviewer is not the appointed reviewer
  then
    refuses NOT_REVIEWER "Only the appointed reviewer can decide this."
  where verification is not in Verifications
  then
    refuses NO_SUCH_VERIFICATION "There is no such proof."
  where verification's status is not PENDING
  then
    refuses NOT_PENDING "This proof has already been decided."
  where reviewer is the appointed reviewer and the verification is pending
  then
    set the verification's status to VERIFIED and its decidedBy to reviewer
    returns verification

reject (reviewer: User, verification: Verification) : returns (verification: Verification)
  where reviewer is not the appointed reviewer
  then
    refuses NOT_REVIEWER "Only the appointed reviewer can decide this."
  where verification is not in Verifications
  then
    refuses NO_SUCH_VERIFICATION "There is no such proof."
  where verification's status is not PENDING
  then
    refuses NOT_PENDING "This proof has already been decided."
  where reviewer is the appointed reviewer and the verification is pending
  then
    set the verification's status to REJECTED and its decidedBy to reviewer
    returns verification

revoke (subject: Subject) : returns ()
  where subject has no VERIFIED verification
  then
    refuses NOT_VERIFIED "This is not verified."
  where subject has a VERIFIED verification
  then
    set that verification's status to REJECTED, leaving decidedBy unchanged
    returns
```

## Queries

```queries
_isReviewer (user: User) : one (appointed: Flag)
  answers true only when user is the appointed reviewer
_isVerified (subject: Subject) : one (verified: Flag)
  answers true only when subject has a verification whose status is VERIFIED
_forSubject (subject: Subject) : optional (verification: Verification, status: Status, decidedBy: User)
  answers the PENDING or VERIFIED verification about subject, if there is one
  answers no row when the subject has only REJECTED verifications, or none
  never answers evidence
_pending () : many (verification: Verification, advertiser: User, subject: Subject)
  answers every PENDING verification, oldest first
  never answers evidence
_get (verification: Verification) : optional (advertiser: User, subject: Subject, status: Status, decidedBy: User)
  answers no row for an unknown verification
  never answers evidence
_evidence (reviewer: User, verification: Verification) : optional (evidence: String)
  answers the evidence only when reviewer is the appointed reviewer and the verification exists
  answers no row for anyone else, including the advertiser
```
