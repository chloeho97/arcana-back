var express = require("express");
var router = express.Router();

const User = require("../models/users");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.status(200).json({ message: "index", title: "Express" });
});

module.exports = router;
