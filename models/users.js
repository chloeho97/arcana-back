const mongoose = require("mongoose");

// Schéma pour un follower
const userFollowersSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

// Schéma pour un following
const userFollowingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

// Schéma pour créer un user
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
      required: true,
    },
    bio: {
      type: String,
    },
    avatar: {
      type: String,
      trim: true,
      default: "/assets/default-avatar.png",
    },
    followers: [userFollowersSchema],
    following: [userFollowingSchema],
    token: {
      type: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("users", userSchema);

module.exports = User;
