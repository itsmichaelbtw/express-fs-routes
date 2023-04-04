import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.json(req.routeMetadata);
});

export default router;
export const routeOptions = {
    metadata: {
        name: "metadata",
        description: "This is a metadata route",
        tags: ["metadata", "route"]
    }
};
