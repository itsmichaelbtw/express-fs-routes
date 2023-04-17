import express from "express";
import path from "path";
import fs from "fs";

import { getPosts } from "../../controllers/get-posts.js";

const router = express.Router();

function uniqueId() {
  const prefix = "post_";
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}${random}`;
}

// fetch all posts
router.get("/", getPosts(), (req, res) => {
  res.json(req.posts);
});

// create a post
router.post("/", getPosts(), async (req, res) => {
  const { name, description } = req.body;
  const posts = req.posts;

  posts.push({
    id: uniqueId(),
    name: name,
    description: description,
    time: new Date().getTime()
  });

  await fs.promises.writeFile(
    path.join(process.cwd(), "..", "database/posts.json"),
    JSON.stringify(posts, null, 4)
  );

  res.send("Post created!");
});

export default router;
