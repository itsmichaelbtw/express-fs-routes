const express = require("express");
const path = require("path");

const { RouteEngine } = require("../../dist/common/fs-routes.cjs");

const app = express();
const port = 3000;

const fsRoutes = new RouteEngine(app, "commonjs");

fsRoutes.setOptions({
  directory: path.join(__dirname, "routes"),
  output: path.join(__dirname, ".fs-routes"),
  redactOutputFilePaths: true
});

async function startApp() {
  await fsRoutes.run();

  app.listen(port, () => {
    console.log(`CommonJS Example app listening at http://localhost:${port}`);
  });
}

startApp();
