import express from "express";

import type { RouterOptions } from "../../../lib";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Hello World!");
});

export default router;
export const routeOptions: RouterOptions = {
    isIndex: true,
    skip: false
};
