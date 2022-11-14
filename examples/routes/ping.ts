import express from "express";

import { RouteHandlerOptions } from "../../lib";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Pong!");
});

export default router;

/**
 * `isIndex` is used to indicate that this route should act upon the root of the
 * directory it is in.
 *
 * This will instead create a route of `/api` instead of `/api/ping`.
 *
 * Remember: `/api` is set using the `appMount` option in `server.ts`.
 */
export const routeOptions: RouteHandlerOptions = {
    // ...
    isIndex: true
};
