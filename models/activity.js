const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["create-collection", "like", "comment", "reply"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "collections",
    },
    comment: {
      type: String,
    },
    reply: {
      type: String,
    },
    isPrivate: { type: Boolean, default: false },
    commentId: {
      // Ajout du champ commentId pour faire référence à un commentaire spécifique
      type: mongoose.Schema.Types.ObjectId,
      ref: "comments",
    },
  },
  { timestamps: true }
);

const Activity = mongoose.model("activities", activitySchema);

module.exports = Activity;
