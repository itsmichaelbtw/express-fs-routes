import express from "express";
import fs from "fs";

const router = express.Router();

router.get("/", async (req, res) => {
  res.send("Hello World!");
});

export default router;
