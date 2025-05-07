const mongoose = require("mongoose");

const elementSchema = new mongoose.Schema(
  {
    // Référence à la collection
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "collections",
      required: true,
    },
    // Métadonnées principales
    type: String,
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    cover: { type: String, trim: true },
    releaseDate: Date,
    author: [{ type: String, trim: true }],
    // Données personnelles de l’utilisateur
    rating: Number,
    review: { type: String, trim: true },
    status: { type: String, trim: true },
    favorite: Boolean,
    // Organisation
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

const Element = mongoose.model("elements", elementSchema);

module.exports = Element;
