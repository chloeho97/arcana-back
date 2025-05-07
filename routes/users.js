var express = require("express");
var router = express.Router();

require("../models/connection");
const User = require("../models/users");
const { checkbody } = require("../modules/checkbody");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Route pour l'inscription (méthode classique)
router.post("/signup", async (req, res) => {
  try {
    if (
      !checkbody(req.body, [
        "username",
        "password",
        "email",
        "firstName",
        "lastName",
      ])
    ) {
      return res.json({ result: false, error: "Missing or empty fields" });
    }

    const existingUser = await User.findOne({
      $or: [{ username: req.body.username }, { email: req.body.email }],
    });
    if (existingUser) {
      return res.json({ result: false, error: "User already exists" });
    }

    const hash = bcrypt.hashSync(req.body.password, 10);

    const newUser = new User({
      username: req.body.username.trim().toLowerCase(),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email.trim().toLowerCase(),
      password: hash,
    });

    await newUser.save();

    res.json({
      result: true,
      userId: newUser._id,
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route pour la connexion (classique)
router.post("/signin", async (req, res) => {
  try {
    if (!checkbody(req.body, ["identification", "password"])) {
      return res.json({ result: false, error: "Missing or empty fields" });
    }

    const { identification, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identification.toLowerCase().trim() },
        { username: identification.toLowerCase().trim() },
      ],
    });

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "24h" }
      );

      user.token = token;
      await user.save();

      res.json({
        result: true,
        token: token,
        userId: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio || "",
        avatar: user.avatar,
        followersCount: user.followers.length,
        followingCount: user.following.length,
      });
    } else {
      res.json({ result: false, error: "User not found or wrong password" });
    }
  } catch (error) {
    console.error("Error during signin:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route pour la déconnexion
router.post("/logout", async (req, res) => {
  try {
    const token = req.body.token;
    if (!token) {
      return res.json({ result: false, error: "No token provided" });
    }

    const user = await User.findOne({ token: token });
    if (user) {
      user.token = null;
      await user.save();
      res.json({ result: true, message: "Logout successful" });
    } else {
      res.json({ result: false, error: "Invalid token" });
    }
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route POST pour récupérer les infos d’un utilisateur via son token
router.post("/by-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ result: false, error: "Missing token" });
    }

    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ result: false, error: "Invalid token" });
    }

    return res.status(200).json({
      result: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        avatar: user.avatar,
        followers: user.followers,
        following: user.following,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching user infos by token:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route PUT pour follow/unfollow un user en utilisant les userId
router.put("/follow", async (req, res) => {
  const { userId, targetUserId } = req.body;
  if (!userId || !targetUserId) {
    return res.status(400).json({ result: false, error: "Missing user IDs" });
  }

  try {
    const user = await User.findById(userId);
    const followedUser = await User.findById(targetUserId);

    if (!user || !followedUser) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    const already = user.following.some((f) =>
      f.userId.equals(followedUser._id)
    );

    if (already) {
      // UNFOLLOW
      await User.updateOne(
        { _id: userId },
        { $pull: { following: { userId: followedUser._id } } }
      );
      await User.updateOne(
        { _id: targetUserId },
        { $pull: { followers: { userId: userId } } }
      );
      return res.json({ result: true, action: "unfollowed" });
    }

    // FOLLOW
    user.following.push({ userId: followedUser._id });
    followedUser.followers.push({ userId: user._id });
    await user.save();
    await followedUser.save();
    res.json({ result: true, action: "followed" });
  } catch (error) {
    console.error("Error during follow/unfollow:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer les connexions (followers + following) via token
router.get("/connections/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ result: false, error: "Invalid userId" });
    }

    res.status(200).json({
      result: true,
      following: user.following.map((f) => f.userId.toString()),
      followers: user.followers.map((f) => f.userId.toString()),
    });
  } catch (error) {
    console.error("Error fetching connections:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer les followers d’un utilisateur via son userId
router.get("/followers/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Vérifie que l'ID est présent
    if (!userId) {
      return res.status(400).json({ result: false, error: "Missing userId" });
    }

    // Recherche l'utilisateur et populate ses followers
    const user = await User.findById(userId).populate(
      "followers.userId",
      "username avatar"
    );

    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    // Retourne la liste des followers
    res.status(200).json({ result: true, followers: user.followers });
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour afficher les following
router.get("/following/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Vérifie que l'ID est présent
    if (!userId) {
      return res.status(400).json({ result: false, error: "Missing userId" });
    }

    // Recherche l'utilisateur et populate ses followers
    const user = await User.findById(userId).populate(
      "following.userId",
      "username avatar"
    );

    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    // Retourne la liste des following
    res.status(200).json({ result: true, following: user.following });
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route pour modifier les infos user

router.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  const updatedData = req.body;

  if (!userId) {
    return res.json({ result: false, error: "No user ID provided" });
  }

  try {
    // Utiliser findByIdAndUpdate pour mettre à jour l'utilisateur directement
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updatedData,
      { new: true } // Retourner l'objet mis à jour
    );

    if (!updatedUser) {
      return res.json({ result: false, error: "User not found" });
    }

    res.json({
      result: true,
      message: "User information updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route pour récupérer les infos utilisateurs par son id
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.json({ result: false, error: "No user ID provided" });
  }

  try {
    const user = await User.findById(userId);

    if (user) {
      res.json({
        result: true,
        user: {
          _id: user._id,
          token: user.token,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          followers: user.followers,
          following: user.following,
          createdAt: user.createdAt,
        },
      });
    } else {
      res.json({ result: false, error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

module.exports = router;
