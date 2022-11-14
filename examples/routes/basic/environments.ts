import express from "express";

import { RouteHandlerOptions } from "../../../lib";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("This is the dev route! You shouldn't see this in production.");
});

export default router;

export const routeOptions: RouteHandlerOptions = {
    environments: ["development"]
};
