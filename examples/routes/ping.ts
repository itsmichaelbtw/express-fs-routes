import express from "express";

import { RouteHandlerOptions } from "../../lib";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Pong!");
});

export default router;

export const routeOptions: RouteHandlerOptions = {
    // ...
};
