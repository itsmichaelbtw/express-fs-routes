/* Generated by: scripts/package-json.ts */

import express from "express";
const router = express.Router({ mergeParams: true });
router.get("/", (req, res) => {
    res.status(200).send(req.originalUrl);
});
export default router;
export const routeOptions = { environments: ["development"] };
