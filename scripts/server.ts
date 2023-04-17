import http from "http";
import express from "express";
import envAgent from "env-agent";

export function spawnServer(): express.Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  return app;
}

export function startServer(app: express.Application): http.Server {
  return app.listen(envAgent.get("PORT"));
}

export function closeServer(server: http.Server): void {
  server.close();
}
