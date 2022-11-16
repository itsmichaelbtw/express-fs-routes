import express from "express";

import { RouteHandlerOptions } from "../../../lib";

const router = express.Router();

router.get("/", async (req, res) => {
    res.send("This route is working!");
});

export default router;

export const routeOptions: RouteHandlerOptions = {
    notImplemented: (req, res, next) => {
        res.status(501).send("This route is not implemented yet!");
    }
};
