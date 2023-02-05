import express from "express";
import fs from "fs";

import { getPosts } from "../../controllers/get-posts.js";

const router = express.Router();

// search for a post
router.get("/", getPosts(), async (req, res) => {
    const search = req.query.name || "";

    const posts = req.posts.filter((post) => {
        return post.name.toLowerCase().includes(search.toLowerCase());
    });

    res.json(posts);
});

export default router;
