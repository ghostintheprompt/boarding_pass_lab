"use strict";

const express = require("express");
const { bookings } = require("./fixtures");

function createServer() {
  const app = express();

  // Vulnerable: the lastName query parameter is accepted and logged, but
  // never actually checked against the booking record. Knowing (or
  // guessing) the PNR alone is enough to retrieve the full passenger
  // record, regardless of what lastName is supplied.
  app.get("/checkin/:pnr", (req, res) => {
    const booking = bookings.find(
      (b) => b.pnr.toUpperCase() === req.params.pnr.toUpperCase()
    );
    if (!booking) return res.status(404).json({ error: "not found" });
    res.json(booking);
  });

  return app;
}

module.exports = { createServer };
