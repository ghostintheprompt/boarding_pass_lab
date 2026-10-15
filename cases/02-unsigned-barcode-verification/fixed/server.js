"use strict";

const express = require("express");
const crypto = require("crypto");
const { encode, decode } = require("../barcode");

const ISSUED_RECORD = {
  name: "M RIVERA",
  flight: "GH204",
  date: "2026-11-02",
  seat: "14C",
  pnr: "QX7F2A",
};

// Lab-only secret, held by the issuing airline's systems, never present
// on the barcode itself.
const SIGNING_KEY = "lab-only-signing-key-do-not-use-in-production";

function sign(payload) {
  return crypto.createHmac("sha256", SIGNING_KEY).update(payload).digest("hex");
}

function createServer() {
  const app = express();
  app.use(express.json());

  // Issues a signed payload for the one record this lab's fixture airline
  // actually has on file. In a real system this happens at check-in.
  app.post("/issue", (req, res) => {
    const payload = encode(ISSUED_RECORD);
    const signature = sign(payload);
    res.json({ payload: `${payload}|${signature}` });
  });

  // Fixed: the scanner recomputes the HMAC over the decoded fields and
  // rejects anything whose signature doesn't match, which catches any
  // tampering regardless of which field was changed.
  app.post("/scan", (req, res) => {
    const parts = req.body.payload.split("|");
    const signature = parts.pop();
    const payload = parts.join("|");
    const fields = decode(payload);

    const wellFormed = Object.values(fields).every((v) => v && v.length > 0);
    if (!wellFormed) return res.status(400).json({ valid: false, reason: "malformed" });

    const expected = sign(payload);
    const signatureOk =
      signature &&
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!signatureOk) {
      return res.status(403).json({ valid: false, reason: "signature mismatch" });
    }
    res.json({ valid: true, fields });
  });

  return app;
}

module.exports = { createServer, ISSUED_RECORD };
