const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Message = require("../models/messages");
const User = require("../models/users");

// GET test /messages/test/:userId
router.get("/test/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    res.json({ message: "Utilisateur trouvé", user });
  } catch (err) {
    console.error("Erreur dans /messages/test/:userId:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET the conversation of a user /messages/conversations/:userId
router.get("/conversations/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "ID utilisateur invalide" });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).populate("sender receiver");

    const usersMap = new Map();
    messages.forEach((msg) => {
      const other =
        msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      usersMap.set(other._id.toString(), other);
    });

    const conversationUsers = Array.from(usersMap.values());
    res.json(conversationUsers);
  } catch (err) {
    console.error("Erreur dans /messages/conversations/:userId:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET the messages between 2 users /messages/:userId1/:userId2
router.get("/:userId1/:userId2", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId1) ||
      !mongoose.Types.ObjectId.isValid(userId2)
    ) {
      return res.status(400).json({ error: "ID(s) utilisateur invalide(s)" });
    }

    const user1 = await User.findById(userId1);
    const user2 = await User.findById(userId2);

    if (!user1 || !user2) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const messages = await Message.find({
      $or: [
        { sender: user1._id, receiver: user2._id },
        { sender: user2._id, receiver: user1._id },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error("Erreur lors de la récupération des messages :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /messages
router.post("/", async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;

    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      return res.status(400).json({ error: "ID(s) utilisateur invalide(s)" });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const newMessage = await Message.create({
      sender: sender._id,
      receiver: receiver._id,
      content,
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET total unread messages count for a user
router.get("/:userId/unread/total", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "ID utilisateur invalide" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Count total unread messages
    const total = await Message.countDocuments({
      receiver: userId,
      read: false,
    });

    // Get the latest unread message
    const lastMessage = await Message.findOne({
      receiver: userId,
      read: false,
    }).sort({ createdAt: -1 });

    res.json({ total, lastMessage });
  } catch (error) {
    console.error("Erreur lors du comptage des messages non lus total:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /start-conversation
router.post("/start-conversation", async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(userId1) ||
      !mongoose.Types.ObjectId.isValid(userId2)
    ) {
      return res.status(400).json({ error: "ID(s) utilisateur invalide(s)" });
    }

    if (userId1 === userId2) {
      return res
        .status(400)
        .json({ error: "Un utilisateur ne peut pas discuter avec lui-même" });
    }

    const user1 = await User.findById(userId1);
    const user2 = await User.findById(userId2);

    if (!user1 || !user2) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Vérifie si une conversation existe déjà
    const existingMessages = await Message.findOne({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    });

    if (existingMessages) {
      // Conversation already exists → return other user info
      return res.status(200).json(user2);
    }

    // No messages yet, return user2 so the frontend can add them to the list
    return res.status(201).json(user2);
  } catch (err) {
    console.error("Erreur dans /messages/start-conversation :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:userId1/:userId2/last", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId1) ||
      !mongoose.Types.ObjectId.isValid(userId2)
    ) {
      return res.status(400).json({ error: "ID(s) utilisateur invalide(s)" });
    }

    const lastMessage = await Message.findOne({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    }).sort({ createdAt: -1 });

    res.json(lastMessage);
  } catch (error) {
    console.error("Erreur lors de la récupération du dernier message:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET count of unread messages
router.get("/:userId1/:userId2/unread/count", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId1) ||
      !mongoose.Types.ObjectId.isValid(userId2)
    ) {
      return res.status(400).json({ error: "ID(s) utilisateur invalide(s)" });
    }

    const count = await Message.countDocuments({
      sender: userId2,
      receiver: userId1,
      read: false,
    });

    res.json({ count });
  } catch (error) {
    console.error("Erreur lors du comptage des messages non lus:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST mark messages as read
router.post("/:userId1/:userId2/mark-read", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId1) ||
      !mongoose.Types.ObjectId.isValid(userId2)
    ) {
      return res.status(400).json({ error: "ID(s) utilisateur invalide(s)" });
    }

    await Message.updateMany(
      { sender: userId2, receiver: userId1, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Erreur lors du marquage des messages comme lus:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ error: "ID message invalide" });
    }

    // Verify that the user is the sender of the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message non trouvé" });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        error:
          "Vous ne pouvez pas supprimer les messages d'autres utilisateurs",
      });
    }

    await Message.findByIdAndDelete(messageId);
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression du message:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE an entire conversation
router.delete("/conversation/:userId1/:userId2", async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId1) ||
      !mongoose.Types.ObjectId.isValid(userId2)
    ) {
      return res.status(400).json({ error: "ID(s) utilisateur invalide(s)" });
    }

    await Message.deleteMany({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression de la conversation:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
module.exports = router;
