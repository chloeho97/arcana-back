const express = require("express");
const router = express.Router();
const cleanOrphanCommentActivity = require("../modules/cleanOrphanCommentActivity");

// POST /admin/cleanup-comments-activity
router.post("/clean-orphan-comments-activity", async (req, res) => {
  try {
    await cleanOrphanCommentActivity();
    res.json({
      result: true,
      message: "Orphan comment activities cleaned successfully.",
    });
  } catch (error) {
    console.error("Error cleaning orphan comment activities:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

module.exports = router;
