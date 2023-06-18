import express from "express";

import { getUsers } from "../../controllers/get-users";

const router = express.Router();

router.get("/", getUsers(), async (req, res) => {
  const search = (req.query.username as string) || "";

  const users = req.users.filter((user) => {
    return user.username.toLowerCase().includes(search.toLowerCase());
  });

  res.json(users);
});

export default router;
