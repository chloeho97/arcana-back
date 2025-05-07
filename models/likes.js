const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    // Auteur du like
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    // Collection likée
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "collections",
    },
  },
  {
    timestamps: true,
  }
);

const Like = mongoose.model("likes", likeSchema);

module.exports = Like;
