const express = require("express");
const fs = require("fs");

const router = express.Router();

router.get("/", async (req, res) => {
    res.send("Hello World!");
});

module.exports = router;
