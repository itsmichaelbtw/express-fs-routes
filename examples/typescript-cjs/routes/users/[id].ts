import express from "express";

import type { RouterOptions } from "../../../../lib";

import { getUsers } from "../../controllers/get-users";

const router = express.Router({ mergeParams: true });

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

export default router;
export const routeOptions: RouterOptions = {
  paramsRegex: {
    id: /user_[0-9]+/
  }
};
