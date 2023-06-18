import type { Server } from "http";
import type { Application } from "express";
import type { RouteRegistry, RouteSchema } from "../lib";

import Supertest from "supertest";

class AppCache {
  private $server: Server | null = null;
  private $app: Application | null = null;

  public get app(): Application {
    return this.$app;
  }

  public get server(): Server {
    return this.$server;
  }

  public set app(app: Application) {
    this.$app = app;
  }

  public set server(server: Server) {
    this.$server = server;
  }

  public destroy(): void {
    this.$app = null;
    this.$server = null;
  }
}

export const appCache = new AppCache();

export function supertest(): Supertest.SuperTest<Supertest.Test> {
  const app = appCache.server;
  return Supertest(app);
}

export async function expectStatusDump(routes: RouteRegistry, status: number) {
  for (const route of routes) {
    await expectStatus(route, status);
  }
}

export async function expectStatus(schema: RouteSchema, status: number) {
  if (schema.status === "registered") {
    if (schema.route_options.paramsRegex) {
      return;
    }

    for (const layer of schema.layers) {
      await supertest().get(layer.complete_path).expect(status);
    }
  }
}
