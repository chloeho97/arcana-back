const User = require("../models/users");
const mongoose = require("mongoose");

async function cleanFollowersAndFollowing() {
  try {
    const users = await User.find(); // get all users

    for (const user of users) {
      let modified = false;

      // Filter followers
      const validFollowers = [];
      for (const follower of user.followers) {
        const exists = await User.exists({ _id: follower.userId });
        if (exists) {
          validFollowers.push(follower);
        } else {
          modified = true;
          console.log(`Removed invalid follower from ${user.username}`);
        }
      }

      // Filter following
      const validFollowing = [];
      for (const followee of user.following) {
        const exists = await User.exists({ _id: followee.userId });
        if (exists) {
          validFollowing.push(followee);
        } else {
          modified = true;
          console.log(`Removed invalid followee from ${user.username}`);
        }
      }

      if (modified) {
        user.followers = validFollowers;
        user.following = validFollowing;
        await user.save();
        console.log(`✅ Cleaned user: ${user.username}`);
      }
    }

    console.log("Followers & following cleanup complete.");
  } catch (error) {
    console.error("Error cleaning followers/following:", error);
  }
}

module.exports = cleanFollowersAndFollowing;
