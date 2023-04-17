import type { RouterRegistry, RouterSchema, TreeNode } from "../../lib/types";

import chai from "chai";
import path from "path";
import fs from "fs";

import { RouteEngine } from "../../lib";

import { newRouteEngine } from "../../scripts/route-engine";
import { appCache, supertest } from "../../scripts/supertest";
import { destroyAllRoutes } from "../../scripts/route-removal";

const routeEngine = newRouteEngine();

async function expectStatus(route: RouterSchema, status: number): Promise<void> {
  if (route.layers.length > 1) {
    for (const layer of route.layers) {
      await supertest().get(layer.complete_path).expect(status);
    }
  } else {
    await supertest().get(route.base_path).expect(status);
  }
}

describe("route-engine", () => {
  afterEach(() => {
    destroyAllRoutes(appCache.app);
    routeEngine.engine.setOptions(routeEngine.cacheOptions);
  });

  it("should throw an error if no 'app' is provided", async () => {
    try {
      new RouteEngine(null, "commonjs");

      chai.expect.fail("Should have thrown an error");
    } catch (error) {
      chai.expect(error).to.be.an("error");
    }
  });

  it("should throw an error if no 'context' is provided", async () => {
    try {
      new RouteEngine(appCache.app, null);

      chai.expect.fail("Should have thrown an error");
    } catch (error) {
      chai.expect(error).to.be.an("error");
    }
  });

  describe("when registering routes", () => {
    it("routes that are declared as 'registered' should return a 200", async () => {
      const registry = await routeEngine.engine.registerRoutes();

      for (const route of registry) {
        if (route.status === "registered" && !route.route_options.paramsRegex) {
          expectStatus(route, 200);
        }
      }
    });

    it("routes that are not declared as 'registered' should return a 404", async () => {
      const registry = await routeEngine.engine.registerRoutes();

      for (const route of registry) {
        if (route.status !== "registered" && !route.route_options.paramsRegex) {
          expectStatus(route, 404);
        }
      }
    });

    it("should throw an error if the file is empty", async () => {
      try {
        routeEngine.engine.setOptions(
          routeEngine.mergeOptions({
            silent: false
          })
        );

        await routeEngine.engine.registerRoutes();

        chai.expect.fail("Should have thrown an error");
      } catch (error) {
        chai.expect(error).to.be.an("error");
      }
    });

    it("should set the status to 'skipped' if the file is empty", async () => {
      const registry = await routeEngine.engine.registerRoutes();

      const errorRoute = registry.find((route) => route.base_path === null);

      chai.expect(errorRoute).to.be.an("object");
      chai.expect(errorRoute?.status).to.equal("skipped");
      chai.expect(errorRoute?.error).to.equal("Most likely forgot to export a default function.");
    });
  });
});
