// routes/autocomplete.js

const express = require("express");
const router = express.Router();

// On importe les fonctions utilitaires qui vont chercher les métadonnées
const {
  fetchMovieMetadata,
  fetchBookMetadata,
  fetchMusicMetadata,
  fetchGameMetadata,
  fetchSerieMetaData,
} = require("../modules/fetchMetaData");

// Route pour récupérer les métadonnées d'une série
router.get("/movie", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Missing query param" });

  try {
    const data = await fetchMovieMetadata(query);
    if (!data) return res.status(404).json({ error: "No result" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// Route pour récupérer les métadonnées d'une série
router.get("/serie", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Missing query param" });

  try {
    const data = await fetchSerieMetaData(query);
    if (!data) return res.status(404).json({ error: "No result" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// Route pour récupérer les métadonnées d’un livre
router.get("/book", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Missing query param" });

  try {
    const data = await fetchBookMetadata(query);
    if (!data) return res.status(404).json({ error: "No result" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// Route pour récupérer les métadonnées d’un album où d'un single
router.get("/music", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Missing query param" });

  try {
    const data = await fetchMusicMetadata(query);
    if (!data) return res.status(404).json({ error: "No result" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

// Route pour récupérer les métadonnées d’un jeu vidéo
router.get("/game", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Missing query param" });

  try {
    const data = await fetchGameMetadata(query);
    if (!data) return res.status(404).json({ error: "No result" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
