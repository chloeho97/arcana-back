require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const collectionsRouter = require("./routes/collections");
const elementsRouter = require("./routes/elements");
const likesRouter = require("./routes/likes");
const commentsRouter = require("./routes/comments");
const autocompleteRouter = require("./routes/autocomplete");
const activityRouter = require("./routes/activity");
const searchRouter = require("./routes/search");
const messageRouter = require("./routes/messages");
const cleanFollowingFollowerRouter = require("./routes/cleanFollowersAndFollowing");
const cleanActivityRouter = require("./routes/cleanOrphanCollectionActivity");
const cleanCollectionRouter = require("./routes/cleanOrphanUserCollections");
const cleanCommentRouter = require("./routes/cleanOrphanCommentActivity");

const app = express();

const cors = require("cors");
app.use(
  cors({
    origin: "https://arcana-front-one.vercel.app",
    credentials: true,
  })
);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/collections", collectionsRouter);
app.use("/elements", elementsRouter);
app.use("/likes", likesRouter);
app.use("/comments", commentsRouter);
app.use("/autocomplete", autocompleteRouter);
app.use("/activity", activityRouter);
app.use("/search", searchRouter);
app.use("/messages", messageRouter);
app.use("/admin", cleanFollowingFollowerRouter);
app.use("/admin", cleanActivityRouter);
app.use("/admin", cleanCollectionRouter);
app.use("/admin", cleanCollectionRouter);
app.use("/admin", cleanCommentRouter);

module.exports = app;
