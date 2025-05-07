const express = require("express");
const router = express.Router();
const Activity = require("../models/activity");
const User = require("../models/users");

//1) GLOBAL FEED — me (+ my following)
router.get("/feed/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { type = "all", onlyFollowing } = req.query;

    const me = await User.findOne({ token });
    if (!me)
      return res.status(404).json({ result: false, error: "Invalid token" });

    const scopeIds = [me._id, ...me.following.map((f) => f.userId)];
    const ids = onlyFollowing === "true" ? scopeIds.slice(1) : scopeIds;

    const filter = { userId: { $in: ids } };
    if (type !== "all") filter.type = type;

    const rawActivities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "username avatar token")
      .populate("collectionId", "title visibility");

    const activities = rawActivities.filter(
      (a) => a.collectionId?.visibility === "public" || !a.collectionId
    );

    res.json({ result: true, activities });
  } catch (err) {
    console.error("feed error", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// USER FEED  by id
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = "all" } = req.query;

    const filter = { userId };
    if (type !== "all") filter.type = type;

    const rawActivities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "username avatar")
      .populate("collectionId", "title visibility");

    const activities = rawActivities.filter(
      (a) => a.collectionId?.visibility === "public" || !a.collectionId
    );

    res.json({ result: true, activities });
  } catch (err) {
    console.error("userId feed error", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

module.exports = router;
