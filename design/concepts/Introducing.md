# Introducing

## Purpose

Keep a person's contact private until they agree to share it with a particular
requester, which prevents disclosing a contact without that person's consent.

## Principle

Tinashe asks to be introduced to Mrs Dube about her cottage. Until she answers,
nothing about her contact is disclosed to him. When she accepts and supplies her
number, the number is disclosed to Tinashe, and only to him. Had she declined,
he would never see it, and he could not ask about the same cottage again until
the cottage is reset.

## Types

```types
external User
  A person who asks for an introduction or is asked for one.

external Subject
  What the introduction is about, such as a place to let.

Status is PENDING or ACCEPTED or DECLINED
  Whether the holder has answered the request, and how.
```

## State

```state
a set of Introductions with
  a requester User
  a holder User
  a subject Subject
  a status Status
  an optional contact String
  Rule: an introduction has a contact exactly when its status is ACCEPTED
```

## Actions

```actions
request (requester: User, holder: User, subject: Subject) : returns (introduction: Introduction)
  where requester is holder
  then
    refuses SELF_INTRODUCTION "You cannot ask to be introduced to yourself."
  where requester already has an introduction about subject
  then
    refuses ALREADY_REQUESTED "You have already asked about this."
  where requester is not holder and has no introduction about subject
  then
    add a new introduction from requester to holder about subject, with status PENDING and no contact
    returns introduction

accept (holder: User, introduction: Introduction, contact: String) : returns (introduction: Introduction)
  where introduction is not in Introductions
  then
    refuses NO_SUCH_INTRODUCTION "There is no such introduction."
  where introduction's holder is not holder
  then
    refuses NOT_HOLDER "Only the person who was asked can answer this request."
  where introduction's status is not PENDING
  then
    refuses ALREADY_ANSWERED "This request has already been answered."
  where contact is blank
  then
    refuses MISSING_CONTACT "A contact is needed to accept an introduction."
  where holder was asked, the request is pending, and contact is not blank
  then
    set the introduction's status to ACCEPTED and its contact to contact
    returns introduction

decline (holder: User, introduction: Introduction) : returns (introduction: Introduction)
  where introduction is not in Introductions
  then
    refuses NO_SUCH_INTRODUCTION "There is no such introduction."
  where introduction's holder is not holder
  then
    refuses NOT_HOLDER "Only the person who was asked can answer this request."
  where introduction's status is not PENDING
  then
    refuses ALREADY_ANSWERED "This request has already been answered."
  where holder was asked and the request is pending
  then
    set the introduction's status to DECLINED
    returns introduction

reset (subject: Subject) : returns ()
  where true
  then
    remove every introduction about subject that is PENDING or DECLINED
    returns
```

## Queries

```queries
_get (introduction: Introduction) : optional (requester: User, holder: User, subject: Subject, status: Status)
  answers no row for an unknown introduction, and never answers its contact
_mine (requester: User, subject: Subject) : optional (introduction: Introduction, status: Status)
  answers the requester's introduction about subject, and no row if they have not asked
_disclosed (requester: User, subject: Subject) : optional (contact: String)
  answers the contact only when the requester's introduction about subject is ACCEPTED
  answers no row while it is PENDING or DECLINED, or when there is no such introduction
_received (holder: User, subject: Subject) : many (introduction: Introduction, requester: User, status: Status)
  answers the introductions about subject that ask holder, in the order they were requested
  answers no rows when nobody has asked
```
