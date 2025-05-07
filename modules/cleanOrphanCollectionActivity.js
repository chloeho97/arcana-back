const Activity = require("../models/activity");
const Collection = require("../models/collections");
const Comment = require("../models/comments");

// Remove every activity that references a collection which no longer exists
async function cleanOrphanCollectionActivity() {
  try {
    const ids = await Collection.distinct("_id"); // existing collections
    const valid = new Set(ids.map((id) => id.toString()));

    const cursor = Activity.find({ collectionId: { $exists: true } }).cursor();
    let removed = 0;

    for await (const act of cursor) {
      if (!valid.has(act.collectionId.toString())) {
        await Activity.deleteOne({ _id: act._id });
        removed += 1;
        console.log(`Removed activity ${act._id}`);
      }
    }

    console.log(`Orphan activity removed: ${removed}`);
  } catch (err) {
    console.error("Error cleaning orphan activity:", err);
  }
}

module.exports = cleanOrphanCollectionActivity;
