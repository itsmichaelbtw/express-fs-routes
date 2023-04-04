import express from "express";

import type { RouterOptions } from "../../../lib";

const router = express.Router();

router.get("/", (req, res) => {
    res.send(req.routeMetadata);
});

export default router;
export const routeOptions: RouterOptions = {
    metadata: {
        title: "Metadata",
        description: "This is a description"
    }
};
