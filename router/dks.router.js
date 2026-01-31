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

module.exports = router;   