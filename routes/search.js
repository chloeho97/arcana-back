const express = require("express");
const router = express.Router();

const Collection = require("../models/collections");
const User = require("../models/users");
const Like = require("../models/likes");

// Route: GET /search?q=your_query
router.get("/", async (req, res) => {
  const query = req.query.q;

  // Check if query is provided
  if (!query) {
    return res.status(400).json({ result: false, message: "Missing query" });
  }

  try {
    const regex = new RegExp(query, "i"); // Case-insensitive search pattern

    // Find collections whose title matches the query
    const rawCollections = await Collection.find({
      $or: [
        { title: regex }, // Search by title
        { tags: regex }, // Search by tags
      ],
    })
      .populate("userId", "username") // populate creator username
      .limit(10);

    // Attach the number of likes to each collection
    const collections = await Promise.all(
      rawCollections.map(async (collection) => {
        const likesCount = await Like.countDocuments({
          collectionId: collection._id,
        });
        return {
          ...collection.toObject(),
          likesCount,
        };
      })
    );

    // Find users whose username matches the query
    const users = await User.find({ username: regex }).limit(10);

    // Send response
    return res.json({ result: true, collections, users });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ result: false, message: "Server error" });
  }
});

// Route: GET /search/popular-tags
router.get("/popular-tags", async (req, res) => {
  try {
    // Agrégation pour trouver les tags les plus utilisés
    const popularTags = await Collection.aggregate([
      { $match: { visibility: "public" } }, // Uniquement les collections publiques
      { $unwind: "$tags" }, // Décompose le tableau de tags
      { $group: { _id: "$tags", count: { $sum: 1 } } }, // Groupe par tag et compte
      { $sort: { count: -1 } }, // Tri par ordre décroissant
      { $limit: 20 }, // Limite aux 20 premiers résultats
    ]);

    return res.json({ result: true, popularTags });
  } catch (err) {
    console.error("Error fetching popular tags:", err);
    return res.status(500).json({ result: false, message: "Server error" });
  }
});

module.exports = router;
