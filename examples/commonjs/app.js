const express = require("express");
const path = require("path");

const { RouteEngine } = require("../../dist/common/fs-routes.cjs");

function join(...name) {
    return path.join(__dirname, ...name);
}

const app = express();
const port = 5050;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fsRoutes = new RouteEngine(app, "commonjs");

fsRoutes.setOptions({
    directory: join("routes"),
    redactOutputFilePaths: true
});

async function startApp() {
    await fsRoutes.registerRoutes();

    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`);
    });
}

startApp();
