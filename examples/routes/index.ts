import express from "express";

import { RouteHandlerOptions } from "../../lib";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Hello World!");
});

export default router;

export const routeOptions: RouteHandlerOptions = {
    // ...
    isIndex: false, // controlled instead by registerRoutes.indexNames
    environments: ["development", "production"]
};
