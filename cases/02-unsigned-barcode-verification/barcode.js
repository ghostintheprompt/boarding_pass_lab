"use strict";

// A simplified stand-in for an IATA BCBP-style boarding pass payload: a
// flat, delimited string of plaintext fields, exactly as the real format
// is structured (name, flight, date, seat, sequence), with no mandatory
// cryptographic signature field in standard use. This lab encodes/decodes
// its own minimal format; it is not a BCBP parser and does not touch any
// real airline's barcode data.

function encode(fields) {
  return [fields.name, fields.flight, fields.date, fields.seat, fields.pnr].join("|");
}

function decode(payload) {
  const [name, flight, date, seat, pnr] = payload.split("|");
  return { name, flight, date, seat, pnr };
}

module.exports = { encode, decode };
