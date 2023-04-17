import express from "express";
import path from "path";
import fs from "fs";

const router = express.Router();

import { getUsers } from "../../controllers/get-users";

function uniqueId() {
  const prefix = "user_";
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}${random}`;
}

router.get("/", getUsers(), (req, res) => {
  res.json(req.users);
});

router.post("/", getUsers(), (req, res) => {
  const { username, password } = req.body;
  const users = req.users;

  users.push({
    id: uniqueId(),
    username: username,
    password: password,
    permissions: [],
    avatar: `https://avatar.reflyui.cc/avatar.png?name=${username}`
  });

  fs.promises.writeFile(
    path.join(process.cwd(), "..", "database/users.json"),
    JSON.stringify(users, null, 4)
  );

  res.send("User created!");
});

export default router;
