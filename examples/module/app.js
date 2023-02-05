import express from "express";
import path from "path";
import url from "url";

import { RouteEngine } from "../../dist/module/fs-routes.esm.js";

function join(name) {
    return path.join(__dirname, name);
}

const app = express();
const port = 5050;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const fsRoutes = new RouteEngine(app, "module");

fsRoutes.setOptions({
    directory: join("routes"),
    redactOutputFilePaths: true
});

await fsRoutes.registerRoutes();

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
