import express from "express";

import { registerRoutes } from "../lib/register";

const app = express();
const port = 5050;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const routes = registerRoutes(app, {
    directory: "examples/routes",
    appMount: "/api"
    // indexNames: ["index"],
    // developmentRoutes: ["user"],
    // regexURLs: true
    // silent: true
});

// console.log(routes);

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
