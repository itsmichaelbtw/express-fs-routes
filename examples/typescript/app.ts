import type { RouteSchema, RouteHandler, RouteHandlerMiddleware } from "../../dist/types";

import express from "express";
import path from "path";

import { RouteEngine } from "../../dist/common/fs-routes.cjs";

const app = express();
const port = 3002;

const fsRoutes = new RouteEngine(app, "commonjs");

fsRoutes.setOptions({
    directory: path.join(__dirname, "routes"),
    redactOutputFilePaths: true,
    beforeRegistration(route: RouteSchema) {
        return route;
    }
    // customMiddleware(route: RouteSchema, handler: RouteHandler): RouteHandlerMiddleware {
    //     return (req, res, next) => {
    //         console.log("custom middleware called");
    //         req.routeMetadata = route.route_options.metadata ?? {};

    //         handler.call(app, req, res, next);
    //     };
    // }
});

async function start() {
    app.use((req, res, next) => {
        console.log("incoming request");

        next();
    });

    await fsRoutes.registerRoutes();

    app.listen(port, () => {
        console.log(`Typescript example app listening at http://localhost:${port}`);
    });
}

start();
