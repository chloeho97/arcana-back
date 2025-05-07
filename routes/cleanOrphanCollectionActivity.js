const express = require("express");
const router = express.Router();
const cleanOrphanCollectionActivity = require("../modules/cleanOrphanCollectionActivity");

// POST /admin/cleanup-collection-activity
router.post("/cleanup-collection-activity", async (_, res) => {
  try {
    await cleanOrphanCollectionActivity();
    res.json({ result: true, message: "Orphan activity cleaned." });
  } catch (err) {
    res.status(500).json({ result: false, error: err.message });
  }
});

module.exports = router;
