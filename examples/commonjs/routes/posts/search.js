const express = require("express");
const fs = require("fs");

const router = express.Router();

const { getPosts } = require("../../controllers/get-posts");

// search for a post
router.get("/", getPosts(), async (req, res) => {
    const search = req.query.name || "";

    const posts = req.posts.filter((post) => {
        return post.name.toLowerCase().includes(search.toLowerCase());
    });

    res.json(posts);
});

module.exports = router;
