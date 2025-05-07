const express = require("express");
const router = express.Router();

require("../models/connection");
const Element = require("../models/elements");
const Collection = require("../models/collections");
const Like = require("../models/likes");
const User = require("../models/users");
const { checkbody } = require("../modules/checkbody");
const Activity = require("../models/activity");

// Route POST pour liker une collection

router.post("/like", async (req, res) => {
  const { userId, collectionId } = req.body;

  if (!userId || !collectionId) {
    return res.json({ result: false, error: "Missing userId or collectionId" });
  }

  try {
    const existingLike = await Like.findOne({ userId, collectionId });

    if (existingLike) {
      return res.json({ result: false, error: "Already liked" });
    }

    // Création du like dans la collection Likes
    const newLike = new Like({ userId, collectionId });
    await newLike.save();

    await Activity.create({
      type: "like",
      userId,
      collectionId,
    });

    res.json({ result: true, like: newLike });
  } catch (error) {
    console.error("Error liking collection:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour afficher tous les likes d'un User
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.json({ result: false, error: "No user ID provided" });
  }

  try {
    const likesByUser = await Like.find({ userId }).populate({
      path: "collectionId",
      select: "title cover description userId elements",
      populate: [
        {
          path: "userId",
          select: "username avatar",
        },
        {
          path: "elements",
          select: "cover",
        },
      ],
    });
    // Filtrer les likes où collectionId ou userId est null
    const validLikes = likesByUser.filter(
      (like) => like.collectionId && like.collectionId.userId
    );

    if (validLikes.length > 0) {
      res.json({ result: true, likes: validLikes });
    } else {
      res.json({ result: false, error: "No likes found for this user" });
    }
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route DELETE pour enlever le like à une collection par l'id user et l'id collection

router.delete("/:userId/:collectionId", async (req, res) => {
  const { userId, collectionId } = req.params;

  if (!userId || !collectionId) {
    return res.json({ result: false, error: "Missing userId or collectionId" });
  }

  try {
    const deletedLike = await Like.deleteOne({ userId, collectionId });

    if (deletedLike.deletedCount === 0) {
      return res.json({ result: false, error: "is not liked" });
    }

    await Activity.deleteOne({ userId, collectionId, type: "like" });

    res.json({ result: true, message: "Like removed" });
  } catch (error) {
    console.error("Error unliking collection:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer tous les likes d'une collection
router.get("/collection/:collectionId", async (req, res) => {
  const { collectionId } = req.params;

  if (!collectionId) {
    return res.json({ result: false, error: "Missing collectionId" });
  }

  try {
    const likes = await Like.find({ collectionId }).populate(
      "userId",
      "username avatar"
    );

    res.json({ result: true, likes });
  } catch (error) {
    console.error("Error fetching likes:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route POST pour récupérer les likes d’un utilisateur via son token
router.post("/by-token", async (req, res) => {
  try {
    const { token } = req.body;

    // Vérifie que le token est présent
    if (!token) {
      return res.json({ result: false, error: "Missing token" });
    }

    // Recherche l'utilisateur correspondant au token
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(401).json({ result: false, error: "Invalid token" });
    }

    // Récupère tous les likes par cet utilisateur
    const likes = await Like.find({ userId: user._id }).populate(
      "collectionId",
      "title userId cover"
    );

    res.json({ result: true, likes });
  } catch (error) {
    console.error("Error fetching likes by token:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

module.exports = router;
