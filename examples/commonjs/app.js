const express = require("express");
const path = require("path");
const fs = require("fs");

const { RouteEngine } = require("../../dist/common/fs-routes.cjs");

const app = express();
const port = 5050;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function join(...name) {
    return path.join(__dirname, ...name);
}

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

// (async () => {
//     fsRoutes.registerRoutes();

//     app.listen(port, () => {
//         console.log(`Example app listening at http://localhost:${port}`);
//     });
// })();
