const express = require("express");
const router = express.Router();
const cleanFollowersAndFollowing = require("../modules/cleanFollowersAndFollowing");

router.post("/cleanup-followers", async (req, res) => {
  try {
    await cleanFollowersAndFollowing();
    res.json({ result: true, message: "Followers/following cleaned." });
  } catch (err) {
    res.status(500).json({ result: false, error: err.message });
  }
});

module.exports = router;
