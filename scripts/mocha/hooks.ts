import envAgent from "env-agent";

import { appCache } from "../supertest";
import { spawnServer, startServer, closeServer } from "../server";

envAgent.set("MOCHA_HOOKS", "8080");

const app = spawnServer();

appCache.app = app;

before(() => {
  const server = startServer(app);
  appCache.server = server;
});

after(() => {
  closeServer(appCache.server);
  appCache.destroy();
});
