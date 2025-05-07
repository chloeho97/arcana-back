const express = require("express");
const router = express.Router();
const cleanOrphanUserCollections = require("../modules/cleanOrphanUserCollections");

// POST /admin/cleanup-orphan-collections
router.post("/cleanup-orphan-collections", async (_, res) => {
  try {
    await cleanOrphanUserCollections();
    res.json({ result: true, message: "Orphan collections cleaned." });
  } catch (err) {
    res.status(500).json({ result: false, error: err.message });
  }
});

module.exports = router;
