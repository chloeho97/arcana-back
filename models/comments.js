const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    // Référence à la collection commentée
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "collections",
      required: true,
    },

    // Référence à l’utilisateur auteur du commentaire
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // Texte du commentaire
    content: { type: String, required: true, trim: true },

    // Référence à un autre commentaire si c’est une réponse
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comments",
      default: null,
    },
  },
  {
    timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  }
);

const Comment = mongoose.model("comments", commentSchema);
module.exports = Comment;
