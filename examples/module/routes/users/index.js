import express from "express";
import path from "path";
import fs from "fs";

import { getUsers } from "../../controllers/get-users.js";

const router = express.Router();

function uniqueId() {
  const prefix = "user_";
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}${random}`;
}

// fetch all users
router.get("/", getUsers(), (req, res) => {
  res.json(req.users);
});

// create a new user
router.post("/", getUsers(), async (req, res) => {
  const { username, password } = req.body;
  const users = req.users;

  users.push({
    id: uniqueId(),
    username: username,
    password: password,
    permissions: [],
    avatar: `https://avatar.reflyui.cc/avatar.png?name=${username}`
  });

  await fs.promises.writeFile(
    path.join(process.cwd(), "..", "database/users.json"),
    JSON.stringify(users, null, 4)
  );

  res.send("User created!");
});

export default router;
