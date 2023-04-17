import express from "express";

import type { RouterOptions } from "../../../lib";
interface Metadata {
  title: number[];
  description: string;
}

const router = express.Router();

router.get("/", (req, res) => {
  res.send(req.routeMetadata);
});

export default router;
export const routeOptions: RouterOptions<Metadata> = {
  metadata: {
    title: [1, 2, 3],
    description: "This is a description"
  }
};
