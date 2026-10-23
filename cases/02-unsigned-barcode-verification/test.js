"use strict";

const assert = require("assert");
const http = require("http");
const { encode } = require("./barcode");

function request(server, path, body) {
  return new Promise((resolve, reject) => {
    const instance = server.listen(0, () => {
      const { port } = instance.address();
      const data = JSON.stringify(body);
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method: "POST",
          // agent:false disables keep-alive so the client socket closes
          // immediately and the test process exits promptly (Node's default
          // agent has keepAlive=true, which can otherwise stall exit).
          agent: false,
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
        },
        (res) => {
          let resBody = "";
          res.on("data", (chunk) => (resBody += chunk));
          res.on("end", () => {
            instance.close();
            resolve({ status: res.statusCode, body: JSON.parse(resBody) });
          });
        }
      );
      req.on("error", (err) => {
        instance.close();
        reject(err);
      });
      req.write(data);
      req.end();
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

  const legit = {
    name: "M RIVERA",
    flight: "GH204",
    date: "2026-11-02",
    seat: "14C",
    pnr: "QX7F2A",
  };
  const tampered = { ...legit, seat: "01A" }; // economy -> first class, same PNR

  // Legitimate payload scans clean on the vulnerable server (no signature at all).
  const vulnLegit = await request(vulnerable, "/scan", { payload: encode(legit) });
  check("vulnerable: legitimate payload scans valid", vulnLegit.body.valid === true);

  // The actual finding: a hand-tampered payload, never issued by anyone,
  // still scans as valid because nothing ties it back to a real record.
  const vulnTampered = await request(vulnerable, "/scan", { payload: encode(tampered) });
  check(
    "vulnerable: tampered payload still scans valid (no integrity check)",
    vulnTampered.body.valid === true && vulnTampered.body.fields.seat === "01A"
  );

  // Fixed server: issue a real signed payload, then verify the unmodified one scans clean.
  const issued = await request(fixed, "/issue", {});
  const issuedPayload = issued.body.payload;
  const fixedLegit = await request(fixed, "/scan", { payload: issuedPayload });
  check("fixed: unmodified issued payload scans valid", fixedLegit.body.valid === true);

  // Tamper with the issued payload's seat field, keep the original (now-invalid) signature.
  const parts = issuedPayload.split("|");
  const signature = parts.pop();
  const [name, flight, date] = parts;
  const tamperedIssued = [name, flight, date, "01A", legit.pnr, signature].join("|");
  const fixedTampered = await request(fixed, "/scan", { payload: tamperedIssued });
  check(
    "fixed: tampered payload is rejected on signature mismatch",
    fixedTampered.status === 403 && fixedTampered.body.valid === false
  );

  console.log(`\n${passed}/${passed} assertions passing.`);
}

main();
