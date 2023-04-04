import express from "express";
import path from "path";

import { RouteEngine } from "../../dist/common/fs-routes.cjs";

const app = express();
const port = 3002;

const fsRoutes = new RouteEngine(app, "commonjs");

fsRoutes.setOptions({
    directory: path.join(__dirname, "routes"),
    beforeRegistration(route) {
        return route;
    },
    redactOutputFilePaths: true
});

async function start() {
    await fsRoutes.registerRoutes();

    app.listen(port, () => {
        console.log(`Typescript example app listening at http://localhost:${port}`);
    });
}

start();
