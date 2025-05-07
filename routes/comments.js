const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

require("../models/connection");
const Comment = require("../models/comments");
const Activity = require("../models/activity");
const User = require("../models/users");
const { checkbody } = require("../modules/checkbody");

// Middleware pour vérifier si l'ID est un ObjectID MongoDB valide
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ result: false, error: "Invalid ID format" });
  }
  next();
};

// Fonction auxiliaire pour vérifier le token et obtenir l'utilisateur
const getUserFromToken = async (token) => {
  if (!token) return null;
  const user = await User.findOne({ token });
  return user;
};

// Route POST pour créer un nouveau commentaire
router.post("/", async (req, res) => {
  try {
    const requiredFields = ["collectionId", "userId", "content"];
    if (!checkbody(req.body, requiredFields)) {
      return res
        .status(400)
        .json({ result: false, error: "Missing or empty fields" });
    }

    // Validation de l'ID de collection et de l'ID utilisateur
    if (
      !mongoose.Types.ObjectId.isValid(req.body.collectionId) ||
      !mongoose.Types.ObjectId.isValid(req.body.userId)
    ) {
      return res
        .status(400)
        .json({ result: false, error: "Invalid ID format" });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(404).json({ result: false, error: "User not found" });
    }

    // Validation du replyTo si présent
    if (
      req.body.replyTo &&
      !mongoose.Types.ObjectId.isValid(req.body.replyTo)
    ) {
      return res
        .status(400)
        .json({ result: false, error: "Invalid replyTo ID format" });
    }

    // Vérifier si le commentaire parent existe si replyTo est spécifié
    if (req.body.replyTo) {
      const parentComment = await Comment.findById(req.body.replyTo);
      if (!parentComment) {
        return res
          .status(404)
          .json({ result: false, error: "Parent comment not found" });
      }
    }

    // Limiter la longueur du contenu du commentaire
    if (req.body.content.length > 500) {
      return res.status(400).json({
        result: false,
        error: "Comment content exceeds maximum length of 500 characters",
      });
    }

    // Création du commentaire
    const newComment = new Comment({
      collectionId: req.body.collectionId,
      userId: req.body.userId,
      content: req.body.content,
      replyTo: req.body.replyTo || null,
    });

    const savedComment = await newComment.save();

    // Log comment in user activity
    await Activity.create({
      type: "comment",
      userId: req.body.userId,
      collectionId: req.body.collectionId,
      comment: req.body.content,
      commentId: savedComment._id,
      timestamp: new Date(),
    });

    // Récupérer le commentaire avec les informations utilisateur
    const populatedComment = await Comment.findById(savedComment._id).populate(
      "userId",
      "username avatar"
    );

    res.json({ result: true, comment: populatedComment });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer un commentaire par son ID
router.get("/:id", validateObjectId, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate(
      "userId",
      "username avatar"
    );

    if (!comment) {
      return res
        .status(404)
        .json({ result: false, error: "Comment not found" });
    }

    res.json({ result: true, comment });
  } catch (error) {
    console.error("Error fetching comment:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer tous les commentaires d'une collection

router.get("/collection/:collectionId", async (req, res) => {
  try {
    const { collectionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return res
        .status(400)
        .json({ result: false, error: "Invalid collection ID format" });
    }

    // Pagination sur les commentaires principaux uniquement
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const allComments = await Comment.find({ collectionId })
      .sort({ createdAt: 1 }) // du plus ancien au plus récent
      .populate("userId", "username avatar");

    const commentMap = new Map();

    // Convertir en objets et init replies
    allComments.forEach((comment) => {
      const obj = comment.toObject();
      obj.replies = [];
      commentMap.set(obj._id.toString(), obj);
    });

    // Organiser les commentaires
    const rootComments = [];

    commentMap.forEach((comment) => {
      if (comment.replyTo) {
        const parent = commentMap.get(comment.replyTo.toString());
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    // Appliquer pagination sur les commentaires racine uniquement
    const paginatedRoots = rootComments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // plus récents en premier
      .slice((page - 1) * limit, page * limit);

    res.json({
      result: true,
      comments: paginatedRoots,
      pagination: {
        total: rootComments.length,
        page,
        limit,
        pages: Math.ceil(rootComments.length / limit),
      },
    });
  } catch (error) {
    console.error("Error building nested comments:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// DELETE UN COMMENT
async function deleteCommentAndReplies(commentId) {
  const replies = await Comment.find({ replyTo: commentId });

  for (const reply of replies) {
    await deleteCommentAndReplies(reply._id);
  }

  const comment = await Comment.findById(commentId);
  if (comment) {
    try {
      await Activity.deleteMany({
        type: { $in: ["comment", "reply"] },
        commentId: comment._id,
      });
    } catch (err) {
      console.error("Error deleting activities:", err);
    }
    // Supprimer le commentaire
    await Comment.findByIdAndDelete(commentId);
  }
}

router.delete("/:id", validateObjectId, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res
        .status(401)
        .json({ result: false, error: "Authentication required" });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ result: false, error: "Invalid token" });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res
        .status(404)
        .json({ result: false, error: "Comment not found" });
    }

    if (
      comment.userId.toString() !== user._id.toString() &&
      user.role !== "admin"
    ) {
      return res.status(403).json({
        result: false,
        error: "Unauthorized: you can only delete your own comments",
      });
    }

    // Supprimer récursivement le commentaire et toutes ses réponses + activités
    await deleteCommentAndReplies(comment._id);

    res.json({
      result: true,
      message: "Comment and related data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route GET pour récupérer les commentaires d'un utilisateur
router.get("/user/:userId", async (req, res) => {
  try {
    // Validation de l'ID utilisateur
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res
        .status(400)
        .json({ result: false, error: "Invalid user ID format" });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Compter le total
    const total = await Comment.countDocuments({ userId: req.params.userId });

    // Récupérer les commentaires
    const comments = await Comment.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("collectionId", "title"); // inclure les infos de la collection

    res.json({
      result: true,
      comments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user comments:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route POST pour récupérer les commentaires d'un utilisateur via son token
router.post("/by-token", async (req, res) => {
  try {
    const { token } = req.body;

    // Vérifie que le token est présent
    if (!token) {
      return res.status(400).json({ result: false, error: "Missing token" });
    }

    // Recherche l'utilisateur correspondant au token
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(401).json({ result: false, error: "Invalid token" });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Compter le total
    const total = await Comment.countDocuments({ userId: user._id });

    // Récupère tous les commentaires postés par cet utilisateur
    const comments = await Comment.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("collectionId", "title"); // inclure les infos de la collection

    res.json({
      result: true,
      comments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching comments by token:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

// Route pour ajouter une réponse à un commentaire
router.post("/:id/reply", validateObjectId, async (req, res) => {
  try {
    // Vérifier si le token est fourni
    const { token, content } = req.body;
    if (!token) {
      return res
        .status(401)
        .json({ result: false, error: "Authentication required" });
    }

    // Vérifier si l'utilisateur existe
    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ result: false, error: "Invalid token" });
    }

    // Vérifier si le commentaire parent existe
    const parentComment = await Comment.findById(req.params.id);
    if (!parentComment) {
      return res
        .status(404)
        .json({ result: false, error: "Parent comment not found" });
    }

    // Vérifier que le contenu est présent
    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ result: false, error: "Comment content is required" });
    }

    // Limiter la longueur du contenu
    if (content.length > 500) {
      return res.status(400).json({
        result: false,
        error: "Comment content exceeds maximum length of 500 characters",
      });
    }

    // Créer la réponse
    const newReply = new Comment({
      collectionId: parentComment.collectionId,
      userId: user._id,
      content: content,
      replyTo: req.params.id,
    });

    const savedReply = await newReply.save();

    // Ajouter l'activité
    await Activity.create({
      type: "reply",
      userId: user._id,
      collectionId: parentComment.collectionId,
      comment: content,
      timestamp: new Date(),
      commentId: savedReply._id,
    });

    // Récupérer la réponse avec les informations utilisateur
    const populatedReply = await Comment.findById(savedReply._id).populate(
      "userId",
      "username avatar"
    );

    res.json({ result: true, reply: populatedReply });
  } catch (error) {
    console.error("Error creating reply:", error);
    res.status(500).json({ result: false, error: "Server error" });
  }
});

module.exports = router;
