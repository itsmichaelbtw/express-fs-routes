import express from "express";

import { RouteHandlerOptions } from "../../../../lib";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("This route is registered based on the `environmentRoutes` option.");
});

export default router;
