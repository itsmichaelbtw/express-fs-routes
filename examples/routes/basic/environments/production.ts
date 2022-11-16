import express from "express";

import { RouteHandlerOptions } from "../../../../lib";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("This is a production route! This is only available in production.");
});

export default router;

export const routeOptions: RouteHandlerOptions = {
    environments: ["production"]
};
