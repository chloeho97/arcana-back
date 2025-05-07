const express = require("express");
const router = express.Router();

require("../models/connection");
const Element = require("../models/elements");
const Collection = require("../models/collections");
const { checkbody } = require("../modules/checkbody");

// Route POST pour créer un nouvel élément
router.post("/", async (req, res) => {
  try {
    // Vérifie que les champs obligatoires sont présents
    const requiredFields = ["collectionId", "title"];
    if (!checkbody(req.body, requiredFields)) {
      return res
        .status(400)
        .json({ result: false, error: "Missing or empty fields" });
    }

    // Crée un nouvel élément à partir du body
    const newElement = new Element({
      collectionId: req.body.collectionId,
      type: req.body.type,
      title: req.body.title,
      description: req.body.description || "",
      review: req.body.review || "",
      author: req.body.author || [],
      rating: req.body.rating || null,
      cover: req.body.cover || "",
      releaseDate: req.body.releaseDate || null,
      status: req.body.status || "",
      favorite: req.body.favorite || false,
      tags: req.body.tags || [],
    });

    // Sauvegarde l’élément dans la base
    const savedElement = await newElement.save();

    if (!savedElement) {
      return res
        .status(400)
        .json({ result: false, error: "Element could not be created" });
    }

    // Met à jour la collection en y ajoutant l’ID de l’élément
    await Collection.findByIdAndUpdate(req.body.collectionId, {
      $push: { elements: savedElement._id },
    });

    // Renvoie l’élément créé
    res.status(201).json({ result: true, element: savedElement });
  } catch (error) {
    console.error("Error creating element:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer un élément par son ID
router.get("/:id", async (req, res) => {
  try {
    // Recherche l'élément par son identifiant
    const element = await Element.findById(req.params.id);

    if (!element) {
      return res
        .status(404)
        .json({ result: false, error: "Element not found" });
    }

    // Renvoie l'élément trouvé
    res.json({ result: true, element });
  } catch (error) {
    console.error("Error fetching element:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer tous les éléments liés à une collection
router.get("/collection/:collectionId", async (req, res) => {
  try {
    // Recherche tous les éléments liés à la collection
    const elements = await Element.find({
      collectionId: req.params.collectionId,
    });

    // Renvoie les éléments
    res.json({ result: true, elements });
  } catch (error) {
    console.error("Error fetching elements by collectionId:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route PUT pour modifier un élément existant
router.put("/:id", async (req, res) => {
  try {
    // Met à jour l'élément avec les nouvelles données
    const updatedElement = await Element.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedElement) {
      return res
        .status(404)
        .json({ result: false, error: "Element not found" });
    }

    // Renvoie l'élément mis à jour
    res.json({ result: true, element: updatedElement });
  } catch (error) {
    console.error("Error updating element:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route DELETE pour supprimer un élément
router.delete("/:id", async (req, res) => {
  try {
    // Supprime l'élément de la base
    const deletedElement = await Element.findByIdAndDelete(req.params.id);

    if (!deletedElement) {
      return res
        .status(404)
        .json({ result: false, error: "Element not found" });
    }

    // Retire aussi l'ID de la collection associée
    await Collection.findByIdAndUpdate(deletedElement.collectionId, {
      $pull: { elements: deletedElement._id },
    });

    // Renvoie une confirmation
    res.json({ result: true, message: "Element deleted successfully" });
  } catch (error) {
    console.error("Error deleting element:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer tous les éléments liés à un user
router.get("/user/:userId", async (req, res) => {
  try {
    // Recherche toutes les collections créées par l'utilisateur
    const userCollections = await Collection.find({
      userId: req.params.userId,
    }).select("_id");

    if (userCollections.length === 0) {
      return res
        .status(404)
        .json({ result: false, error: "No collections found for this user." });
    }

    // Recherche tous les éléments des collections de cet utilisateur
    const elements = await Element.find({
      collectionId: { $in: userCollections.map((c) => c._id) },
    });

    if (elements.length === 0) {
      return res.status(404).json({
        result: false,
        error: "No elements found in user collections.",
      });
    }

    // Compter le nombre d'éléments par type
    const typeCounts = elements.reduce((acc, el) => {
      acc[el.type] = (acc[el.type] || 0) + 1;
      return acc;
    }, {});

    // Total d'éléments
    const total = elements.length;

    // Calcul des % pour le camembert
    const stats = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: ((count / total) * 100).toFixed(0),
    }));

    // Compter le nombre d'éléments par statut
    const statusCounts = elements.reduce((acc, el) => {
      acc[el.status] = (acc[el.status] || 0) + 1;
      return acc;
    }, {});

    // Calcul des statuts sans pourcentage (seulement le nombre brut)
    const statusStats = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    res.json({ result: true, elements, stats, statusStats });
  } catch (error) {
    console.error("Error fetching elements by userId:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

module.exports = router;
