/* Generated by: scripts/mocha */

import express from "express";const router = express.Router({ mergeParams: true });router.get("/", (req, res) => {res.status(200).send(req.routeMetadata);});export default router;export const routeOptions = {"metadata": {"my_custom_metadata": "my_custom_metadata"}};