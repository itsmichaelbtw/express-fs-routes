import express from "express";
import path from "path";

import { registerRoutes } from "../lib/register";

const app = express();
const port = 5050;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function join(name: string): string {
    return path.join(__dirname, name);
}

registerRoutes(app, {
    directory: join("routes"),
    appMount: "/api",
    output: join(".fs-routes"),
    environmentRoutes: {
        development: [join("routes")]
    },
    silent: true
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
