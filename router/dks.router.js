var express = require('express');
var router = express.Router();
var redirect = require('../redirect/dks.redirect');

router.post("/load", redirect.load);

router.post("/echo", (req, res) => {
  return res.json({
    ok: true,
    url: req.originalUrl,
    method: req.method,
    headers: {
      "content-type": req.headers["content-type"],
      "x-request-id": req.headers["x-request-id"],
      "user-agent": req.headers["user-agent"],
    },
    body: req.body,
  });
});

router.post("/mock/token", (req, res) => {
  const { userid, password } = req.body || {};
  if (!userid || !password) {
    return res.status(422).json({
      Details: [{ status: false, error_code: "ERR_VALIDATION_MISSING_FIELD", message: "userid/password required" }]
    });
  }
  return res.json({
    Details: [{ status: true, message: "Auth Token Generated (MOCK)", token: 123456 }]
  });
});

module.exports = router;   