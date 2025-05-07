const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    // Contenu principal
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    cover: { type: String, trim: true, default: "/assets/default-cover.png" },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    // Propriétaire et collaborateurs
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    // Structure et interactions
    elements: [{ type: mongoose.Schema.Types.ObjectId, ref: "elements" }],
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

const Collection = mongoose.model("collections", collectionSchema);

module.exports = Collection;
