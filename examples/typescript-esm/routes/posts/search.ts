import express from "express";
import fs from "fs";

import { getPosts } from "../../controllers/get-posts";

const router = express.Router();

router.get("/", getPosts(), async (req, res) => {
  const search = (req.query.name as string) || "";

  const posts = req.posts.filter((post) => {
    return post.name.toLowerCase().includes(search.toLowerCase());
  });

  res.json(posts);
});

export default router;
