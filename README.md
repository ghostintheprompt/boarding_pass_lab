# boarding_pass_lab

A reproducible lab for vulnerability classes in airline check-in and
boarding-pass systems — the sequel to
[`transit_fare_lab`](../transit_fare_lab), following the same
transit-to-airport thread, one step before the physical access-control
layer in [`airport_pacs_lab`](../airport_pacs_lab). Same pattern as both:
one case per directory, a vulnerable version and a fixed version of the
same server, a two-part test (legitimate path + the actual finding) run
against each, Docker-verified from the start.

## Why boarding passes

Transit fare went digital; airports have two separate digital-adjacent
surfaces worth separating out. `airport_pacs_lab` covers the physical
badge/door-controller layer. This one covers the layer every traveler
actually touches: the check-in portal that looks up your booking, and
the barcode that gets scanned at the gate.

Both cases below model real, long-public vulnerability classes, not
anything novel:

- Airline check-in and manage-booking portals accepting a reservation
  code without properly validating the second identity factor
  (typically last name) has been reported against multiple real airlines
  over the years — guessable or leaked booking references turning into
  full passenger-record disclosure.
- The industry-standard boarding-pass barcode format (IATA BCBP) carries
  no mandatory cryptographic signature in standard deployment. Security
  researchers have demonstrated forged/modified boarding passes passing
  visual and barcode-reader inspection for close to two decades. Nothing
  here is a new technique — it's a clean, runnable demonstration of a
  well-known industry gap, built against this lab's own fixture data, no
  real airline, no real PNR, no real barcode touched.

## Cases

- [`01-pnr-lookup-idor`](./cases/01-pnr-lookup-idor/) — a check-in
  endpoint that accepts a `lastName` parameter, logs it, and never
  actually checks it against the booking. Any valid PNR returns the full
  passenger record regardless of what name is supplied. Fixed version
  adds the one check: the supplied last name must match the record.
- [`02-unsigned-barcode-verification`](./cases/02-unsigned-barcode-verification/) —
  a gate-scanner simulation that validates a boarding-pass barcode
  payload is well-formed, but never checks it against what the airline
  actually issued, because the payload carries no signature tying it
  back to a real record. A hand-tampered payload (seat silently upgraded
  from economy to first class) scans exactly as valid as a real one.
  Fixed version signs the payload at issuance with an HMAC over its
  fields and rejects any payload whose signature doesn't match on scan.

## Running it

```bash
npm install
npm test
```

Or containerized:

```bash
docker compose build
docker compose run --rm lab
```

Both run identically — confirmed live, 8/8 passing either way.

## Standing rules for every case added here

Same as `cve_lab` / `transit_fare_lab` / `airport_pacs_lab`:

- Vulnerable and fixed server for a case differ by exactly the one check
  under test, so the diff itself is the finding.
- Exploit demonstrations are non-destructive probes proving a boundary
  holds or doesn't, never a weaponized payload, never against anything
  but this lab's own fixture data. No real airline system, real PNR
  format reverse-engineering, or real BCBP barcode is touched or modeled
  at the implementation level — this stays at the application-logic
  layer, which is where the actual fix lives anyway.
- Every claim gets actually run before it's written down as fact.

## Queued next

- A PNR keyspace/rate-limiting case: demonstrating that a short,
  low-entropy booking-reference format combined with no rate limiting on
  the lookup endpoint makes targeted enumeration tractable, and what a
  fixed version's rate limiting / lockout actually looks like.
- A loyalty-number harvesting angle: the barcode payload in real BCBP use
  can carry a frequent-flyer number not shown on the printed pass, worth
  a case on what's exposed beyond what the passenger can see.
