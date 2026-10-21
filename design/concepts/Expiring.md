# Expiring

## Purpose

Prevent a stale claim of availability by requiring that it be reconfirmed
before its timer runs out.

## Principle

Mrs Dube's Avondale cottage is started for 30 days and is current. She renews
before the deadline; it stays current, with a new deadline. If she does not,
once the deadline has passed `expire` deletes the timer and the cottage is no
longer current. A second `start` while a timer exists is refused. `renew` after
the deadline is refused. `reschedule` sets a new deadline on an existing timer,
even if that deadline is already past.

## Types

```types
external Resource
  Something that can go stale, such as a place to let.
```

## State

```state
a set of Timers with
  a unique resource Resource
  a deadline DateTime
  Rule: a resource has at most one timer
```

## Actions

```actions
start (resource: Resource, duration: Number) : returns (resource: Resource, deadline: DateTime)
  where duration is not a positive number of milliseconds
  then
    refuses INVALID_DURATION "A timer needs a positive duration."
  where resource already has a timer
  then
    refuses ALREADY_TIMED "This already has a timer."
  where resource has no timer and duration is a positive number of milliseconds
  then
    add a timer for resource with deadline now + duration
    returns resource, deadline

reschedule (resource: Resource, duration: Number) : returns (resource: Resource, deadline: DateTime)
  where duration is not a positive number of milliseconds
  then
    refuses INVALID_DURATION "A timer needs a positive duration."
  where resource has no timer
  then
    refuses NO_SUCH_TIMER "There is no timer for this."
  where resource has a timer and duration is a positive number of milliseconds
  then
    set the timer's deadline to now + duration
    returns resource, deadline

renew (resource: Resource, duration: Number) : returns (resource: Resource, deadline: DateTime)
  where duration is not a positive number of milliseconds
  then
    refuses INVALID_DURATION "A timer needs a positive duration."
  where resource has no timer
  then
    refuses NO_SUCH_TIMER "There is no timer for this."
  where resource has a timer whose deadline is not in the future
  then
    refuses NOT_CURRENT "This is no longer current."
  where resource has a timer whose deadline is in the future and duration is a positive number of milliseconds
  then
    set the timer's deadline to now + duration
    returns resource, deadline

expire (resource: Resource) : returns (resource: Resource)
  where resource has no timer
  then
    refuses NO_SUCH_TIMER "There is no timer for this."
  where resource has a timer whose deadline is in the future
  then
    refuses STILL_CURRENT "This is still current."
  where resource has a timer whose deadline has passed
  then
    delete the timer
    returns resource
```

## Queries

```queries
_isCurrent (resource: Resource) : one (current: Flag)
  answers true only when resource has a timer whose deadline is in the future
_get (resource: Resource) : optional (deadline: DateTime)
  answers the timer's deadline
  answers no row when resource has no timer
_due () : many (resource: Resource, deadline: DateTime)
  answers every timer whose deadline is not in the future, oldest deadline first
```
