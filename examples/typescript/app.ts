import express from "express";

import { RouteEngine } from "../../lib";

const app = express();

const fsRoutes = new RouteEngine(app, "commonjs");

async function start() {
    fsRoutes.setOptions({
        directory: "examples/typescript/routes"
    });

    await fsRoutes.registerRoutes();

    app.listen(3000, () => {
        console.log("Server started on port 3000");
    });
}

start();
