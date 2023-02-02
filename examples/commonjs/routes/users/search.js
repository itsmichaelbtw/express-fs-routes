const express = require("express");
const fs = require("fs");

const router = express.Router();

const { getUsers } = require("../../controllers/get-users");

// search for a user
router.get("/", getUsers(), async (req, res) => {
    const search = req.query.username || "";

    const users = req.users.filter((user) => {
        return user.username.toLowerCase().includes(search.toLowerCase());
    });

    res.json(users);
});

module.exports = router;
