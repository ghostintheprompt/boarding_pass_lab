"use strict";

const express = require("express");
const { decode } = require("./barcode");

const ISSUED_RECORD = {
  name: "M RIVERA",
  flight: "GH204",
  date: "2026-11-02",
  seat: "14C",
  pnr: "QX7F2A",
};

function createServer() {
  const app = express();
  app.use(express.json());

  // Vulnerable: the "gate scanner" only checks that the payload is
  // well-formed (all five fields present). It never checks the decoded
  // fields against the airline's own issued record, because the payload
  // carries no signature tying it back to that record. Any payload with
  // the right shape scans as valid, regardless of whether its contents
  // match what was actually issued.
  app.post("/scan", (req, res) => {
    const fields = decode(req.body.payload);
    const wellFormed = Object.values(fields).every((v) => v && v.length > 0);
    if (!wellFormed) return res.status(400).json({ valid: false, reason: "malformed" });
    res.json({ valid: true, fields });
  });

  return app;
}

module.exports = { createServer, ISSUED_RECORD };
