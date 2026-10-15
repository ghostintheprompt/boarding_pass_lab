"use strict";

const assert = require("assert");
const http = require("http");

function get(server, path) {
  return new Promise((resolve, reject) => {
    const instance = server.listen(0, () => {
      const { port } = instance.address();
      http
        .get(`http://127.0.0.1:${port}${path}`, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            instance.close();
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          });
        })
        .on("error", (err) => {
          instance.close();
          reject(err);
        });
    });
  });
}

let passed = 0;
function check(label, cond) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`PASS: ${label}`);
  passed++;
}

async function main() {
  const vulnerable = require("./server").createServer();
  const fixed = require("./fixed/server").createServer();

  // Legitimate lookup: correct PNR + correct last name works on both.
  const vulnLegit = await get(vulnerable, "/checkin/QX7F2A?lastName=RIVERA");
  check("vulnerable: legitimate lookup succeeds", vulnLegit.status === 200);

  const fixedLegit = await get(fixed, "/checkin/QX7F2A?lastName=RIVERA");
  check("fixed: legitimate lookup succeeds", fixedLegit.status === 200);

  // The actual finding: correct PNR, WRONG last name (someone else's
  // booking, guessed PNR, no relationship to the real passenger).
  const vulnIdor = await get(vulnerable, "/checkin/LW9K3C?lastName=SMITH");
  check(
    "vulnerable: wrong last name still returns the booking (IDOR)",
    vulnIdor.status === 200 && vulnIdor.body.passengerName === "A OKONKWO"
  );

  const fixedIdor = await get(fixed, "/checkin/LW9K3C?lastName=SMITH");
  check(
    "fixed: wrong last name is rejected",
    fixedIdor.status === 403
  );

  console.log(`\n${passed}/${passed} assertions passing.`);
}

main();
