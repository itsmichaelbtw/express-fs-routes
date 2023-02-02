const express = require("express");
const fs = require("fs");

const router = express.Router({ mergeParams: true });

const { getUsers } = require("../../controllers/get-users");

// get specific user
router.get("/", getUsers(), async (req, res) => {
    const id = req.params.id;

    const user = req.users.find((user) => {
        return user.id === id;
    });

    res.json(user);
});

// get user avatar
router.get("/avatar", async (req, res) => {});

// update user avatar
router.put("/avatar", async (req, res) => {});

// get user permissions
router.get("/permissions", async () => {});

// update user permissions
router.put("/permissions", async () => {});

// delete user
router.delete("/", async (req, res) => {});

module.exports = router;
module.exports.routeOptions = {
    paramsRegex: {
        id: /user_[a-z0-9]{9}/
    }
};
