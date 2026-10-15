"use strict";

const express = require("express");
const { bookings } = require("../fixtures");

function createServer() {
  const app = express();

  // Fixed: the one check that was missing. lastName is required and must
  // match the booking record (case-insensitive) before any passenger data
  // is returned.
  app.get("/checkin/:pnr", (req, res) => {
    const lastName = (req.query.lastName || "").toUpperCase();
    const booking = bookings.find(
      (b) => b.pnr.toUpperCase() === req.params.pnr.toUpperCase()
    );
    if (!booking) return res.status(404).json({ error: "not found" });
    if (!lastName || booking.lastName.toUpperCase() !== lastName) {
      return res.status(403).json({ error: "last name does not match this booking" });
    }
    res.json(booking);
  });

  return app;
}

module.exports = { createServer };
