import express from "express";
import path from "path";
import url from "url";

import { RouteEngine } from "../../dist/module/fs-routes.esm.js";

function join(name) {
    return path.join(path.dirname(url.fileURLToPath(import.meta.url)), name);
}

const app = express();
const port = 3001;

const fsRoutes = new RouteEngine(app, "module");

fsRoutes.setOptions({
    directory: join("routes"),
    output: join(".fs-routes"),
    redactOutputFilePaths: true
});

await fsRoutes.registerRoutes();

app.listen(port, () => {
    console.log(`Module example app listening at http://localhost:${port}`);
});
