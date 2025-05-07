const express = require("express");
const router = express.Router();
const Collection = require("../models/collections");
const Like = require("../models/likes");
const Activity = require("../models/activity");
const User = require("../models/users");
const { checkbody } = require("../modules/checkbody");
const { ObjectId } = require("mongodb");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

// Route POST pour créer une nouvelle collection
router.post("/", async (req, res) => {
  try {
    // Champs obligatoires à vérifier
    const requiredFields = ["title", "userId", "visibility"];

    if (!checkbody(req.body, requiredFields)) {
      return res.json({ result: false, error: "Missing or empty fields" });
    }

    let coverUrl = undefined;

    // Vérifier si une cover a été envoyée
    if (req.files && req.files.cover) {
      const coverFile = req.files.cover;
      const tempDir = path.join(__dirname, "tmp");

      // Vérifier si le dossier temporaire existe, sinon le créer
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(
        tempDir,
        `${Date.now()}_${coverFile.name}`
      );

      // Sauvegarder temporairement l'image
      await coverFile.mv(tempFilePath);

      // Vérifier que le fichier existe avant de le téléverser
      if (fs.existsSync(tempFilePath)) {
        const cloudinaryResponse = await cloudinary.uploader.upload(
          tempFilePath,
          {
            folder: "collectionCover", // Spécifier le dossier sur Cloudinary
          }
        );

        // Supprimer le fichier temporaire après téléversement
        fs.unlinkSync(tempFilePath);

        // Stocker l'URL de l'image téléversée
        coverUrl = cloudinaryResponse.secure_url;
      } else {
        return res
          .status(500)
          .json({ result: false, error: "Temporary file not found" });
      }
    }

    // Création de la collection
    const newCollection = new Collection({
      title: req.body.title,
      description: req.body.description || "",
      cover: coverUrl, // Ajout de l'URL de la cover
      visibility: req.body.visibility,
      userId: req.body.userId,
      collaborators: req.body.collaborators || [],
      elements: req.body.elements || [],
      comments: req.body.comments || [],
      tags: req.body.tags || [],
    });

    // Sauvegarde dans la base de données
    await newCollection.save();

    // Ajout au fil d'activité
    await Activity.create({
      type: "create-collection",
      userId: req.body.userId,
      collectionId: newCollection._id,
    });

    // Renvoie la collection créée au client
    res.json({ result: true, collection: newCollection });
  } catch (error) {
    // Gère les erreurs et renvoie une réponse d’erreur
    console.error("Error creating collection:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer toutes les collections
router.get("/", async (req, res) => {
  try {
    // Récupère toutes les collections depuis la base de données
    const collections = await Collection.find();

    // Renvoie les collections au client
    res.json({ result: true, collections });
  } catch (error) {
    // Gère les erreurs et renvoie une réponse d’erreur
    console.error("Error fetching collections:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// GET /collections/top – always return 10 valid public collections
router.get("/top", async (_, res) => {
  try {
    const raw = await Collection.aggregate([
      { $match: { visibility: "public" } },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "collectionId",
          as: "likes",
        },
      },
      { $addFields: { likeCount: { $size: "$likes" } } },
      { $sort: { likeCount: -1, createdAt: -1 } },
      { $limit: 50 }, // take more to survive filtering
    ]);

    const populated = await Collection.populate(raw, [
      {
        path: "userId",
        select: "username avatar",
      },
      {
        path: "elements",
        select: "cover",
      },
    ]);

    // keep only rows whose user was found
    const valid = populated
      .filter((c) => c.userId && c.userId.username)
      .slice(0, 10);

    res.json({ result: true, collections: valid });
  } catch (err) {
    console.error("Error fetching top collections:", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// GET /collections/recent – latest 10 public collections
router.get("/recent", async (_, res) => {
  try {
    const collections = await Collection.find({ visibility: "public" })
      .populate("userId", "username avatar")
      .populate("elements", "cover")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ result: true, collections });
  } catch (err) {
    console.error("Error fetching recent collections:", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// GET /collections/random – 10 random public collections
router.get("/random", async (_, res) => {
  try {
    const sample = await Collection.aggregate([
      { $match: { visibility: "public" } },
      { $sample: { size: 10 } },
    ]);

    const populated = await Collection.populate(sample, [
      {
        path: "userId",
        select: "username avatar",
      },
      {
        path: "elements",
        select: "cover",
      },
    ]);

    res.json({ result: true, collections: populated });
  } catch (err) {
    console.error("Error fetching random collections:", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// GET /collections/:id – collection detail
router.get("/:id", async (req, res) => {
  try {
    const col = await Collection.findById(req.params.id)
      .populate("userId")
      .populate("elements");

    if (!col) {
      return res
        .status(404)
        .json({ result: false, error: "Collection not found" });
    }
    res.json({ result: true, collection: col });
  } catch (err) {
    console.error("Error fetching collection:", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// PUT /collections/:id – update collection
router.put("/:id", async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res
        .status(404)
        .json({ result: false, error: "Collection not found" });
    }

    let coverUrl = collection.cover; // Conserver l'ancienne image si aucune nouvelle n'est envoyée

    // Vérifier si une nouvelle cover a été envoyée
    if (req.files && req.files.cover) {
      const coverFile = req.files.cover;
      const tempDir = path.join(__dirname, "tmp");

      // Vérifier si le dossier temporaire existe, sinon le créer
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(
        tempDir,
        `${Date.now()}_${coverFile.name}`
      );

      // Sauvegarder temporairement l'image
      await coverFile.mv(tempFilePath);

      // Vérifier que le fichier existe avant de le téléverser
      if (fs.existsSync(tempFilePath)) {
        const cloudinaryResponse = await cloudinary.uploader.upload(
          tempFilePath,
          {
            folder: "collectionCover", // Dossier Cloudinary
          }
        );

        // Supprimer le fichier temporaire après téléversement
        fs.unlinkSync(tempFilePath);

        // Stocker l'URL de la nouvelle image téléversée
        coverUrl = cloudinaryResponse.secure_url;
      } else {
        return res
          .status(500)
          .json({ result: false, error: "Temporary file not found" });
      }
    }

    // Mettre à jour la collection avec la nouvelle cover si elle a changé
    const updatedCollection = await Collection.findByIdAndUpdate(
      req.params.id,
      { ...req.body, cover: coverUrl }, // Mise à jour avec la nouvelle image
      { new: true }
    );

    res.json({ result: true, collection: updatedCollection });
  } catch (err) {
    console.error("Error updating collection:", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// DELETE /collections/:id – remove collection and related activity/likes
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Collection.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res
        .status(404)
        .json({ result: false, error: "Collection not found" });
    }

    await Activity.deleteMany({
      type: "create-collection",
      collectionId: req.params.id,
    });
    await Like.deleteMany({ collectionId: req.params.id });

    res.json({ result: true, message: "Collection deleted successfully" });
  } catch (err) {
    console.error("Error deleting collection:", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// GET /collections/user/:userId – collections for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const collections = await Collection.find({
      userId: req.params.userId,
    }).populate({
      path: "elements",
      select: "cover",
    });
    res.json({ result: true, collections });
  } catch (err) {
    console.error("Error fetching collections by userId:", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// POST /collections/by-token – collections for the user token
router.post("/by-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.json({ result: false, error: "Missing token" });

    const user = await User.findOne({ token });
    if (!user)
      return res.status(401).json({ result: false, error: "Invalid token" });

    const collections = await Collection.find({ userId: user._id });
    res.json({ result: true, collections });
  } catch (err) {
    console.error("Error fetching collections by token:", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// GET /collections/user/:userId - collections for a user, sorted by like count
router.get("/top/:userId", async (req, res) => {
  try {
    const raw = await Collection.aggregate([
      {
        $match: {
          userId: new ObjectId(req.params.userId),
          visibility: "public",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "collectionId",
          as: "likes",
        },
      },
      { $addFields: { likeCount: { $size: "$likes" } } },
      { $sort: { likeCount: -1, createdAt: -1 } },
      { $limit: 1 },
    ]);

    const populated = await Collection.populate(raw, [
      {
        path: "userId",
        select: "username avatar",
      },
      {
        path: "elements",
        select: "cover",
      },
    ]);

    // keep only rows whose user was found
    const valid = populated
      .filter((c) => c.userId && c.userId.username)
      .slice(0, 10);

    res.json({ result: true, collections: valid });
  } catch (err) {
    console.error("Error fetching top collections:", err);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

module.exports = router;
