import express from "express";

import { RouteHandlerOptions } from "../../lib";

const router = express.Router();

router.get("/route", (req, res) => {
    res.send("As you can see, URLs that are set within a route still work.");
});

export default router;

export const routeOptions: RouteHandlerOptions = {
    // ...
};
