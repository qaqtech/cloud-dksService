var express = require('express');
var router = express.Router();
var redirect = require('../redirect/dks.redirect');

router.post("/load", redirect.load);


module.exports = router;   