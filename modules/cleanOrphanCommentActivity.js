const Activity = require("../models/activity");
const Comment = require("../models/comments");

// Clean orphan activities that don't have a valid commentId
async function cleanOrphanCommentActivity() {
  try {
    // Trouver toutes les activités de type "comment" sans champ "commentId" valide
    const cursor = Activity.find({
      $or: [
        { type: "comment", commentId: { $exists: false } },
        { type: "reply", commentId: { $exists: false } },
      ],
    }).cursor();

    let removed = 0;

    for await (const activity of cursor) {
      console.log("Found orphan activity to remove:", activity); // Log des activités trouvées
      await Activity.deleteOne({ _id: activity._id });
      removed += 1;
      console.log(`Removed orphan activity ${activity._id}`);
    }

    console.log(
      `Total orphan comment activities without valid commentId removed: ${removed}`
    );

    // Supprimer des activités les commentaires/reply qui n'existent dans la collection Comments

    // Récuprer les IDs des commentaires existants

    const existingComments = await Comment.find({}, { _id: 1 }).lean();
    const existingCommentIds = new Set(
      existingComments.map((c) => c._id.toString())
    );

    // Trouver les activités de type comment ou reply avec un commentId inexistant
    const cursorBis = Activity.find({
      type: { $in: ["comment", "reply"] },
      commentId: { $exists: true },
    }).cursor();

    let removedBis = 0;

    for await (const activity of cursorBis) {
      if (!existingCommentIds.has(activity.commentId.toString())) {
        console.log("Found orphan activity to remove:", activity); // Log des activités orphelines
        await Activity.deleteOne({ _id: activity._id });
        removedBis += 1;
        console.log(`Removed orphan activity ${activity._id}`);
      }
    }

    console.log(
      `Total orphan comment/reply activities with non-existing commentId removed: ${removedBis}`
    );
  } catch (err) {
    console.error(
      "Error cleaning orphan comment/reply activities with non-existing commentId:",
      err
    );
  }
}
module.exports = cleanOrphanCommentActivity;
