const Collection = require("../models/collections");
const User = require("../models/users");

async function cleanOrphanUserCollections() {
  const existingUserIds = await User.distinct("_id");
  const validUserIds = new Set(existingUserIds.map((id) => id.toString()));

  const cursor = Collection.find({ userId: { $exists: true } }).cursor();
  let removed = 0;

  for await (const col of cursor) {
    if (!validUserIds.has(col.userId.toString())) {
      await Collection.deleteOne({ _id: col._id });
      removed++;
      console.log(`Deleted orphaned collection: ${col._id}`);
    }
  }

  console.log(`Removed ${removed} orphan collections.`);
}

module.exports = cleanOrphanUserCollections;
