import express from "express";
import path from "path";
import url from "url";

import { RouteEngine } from "../../dist/common/fs-routes.cjs";

function join(name) {
  return path.join(path.dirname(url.fileURLToPath(import.meta.url)), name);
}

const app = express();
const port = 3002;

const fsRoutes = new RouteEngine(app, "module");

fsRoutes.setOptions({
  directory: join("routes"),
  output: join(".fs-routes"),
  redactOutputFilePaths: true
});

async function start() {
  await fsRoutes.run();

  app.listen(port, () => {
    console.log(`Typescript example app listening at http://localhost:${port}`);
  });
}

start();
