import express from "express";
import fs from "fs";

import { getUsers } from "../../controllers/get-users.js";

const router = express.Router({ mergeParams: true });

// get specific user
router.get("/", getUsers(), async (req, res) => {
  const id = req.params.id;

  const user = req.users.find((user) => {
    return user.id === id;
  });

  res.json(user);
});

// get user avatar
router.get("/avatar", async (req, res) => {
  res.send("avatar");
});

// update user avatar
router.put("/avatar", async (req, res) => {
  res.send("avatar updated");
});

// get user permissions
router.get("/permissions", async (req, res) => {
  res.send("permissions");
});

// update user permissions
router.put("/permissions", async (req, res) => {
  res.send("permissions updated");
});

// delete user
router.delete("/", async (req, res) => {
  const id = req.params.id;

  const users = req.users.filter((user) => {
    return user.id !== id;
  });

  await fs.promises.writeFile(
    (path.join(process.cwd(), "..", "database/users.json"), JSON.stringify(users, null, 4))
  );

  res.send("User deleted!");
});

export default router;
export const routeOptions = {
  paramsRegex: {
    id: /user_[a-z0-9]{9}/
  }
};
