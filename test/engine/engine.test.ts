import type { RouteSchema, TreeNode } from "../../lib/types";

import chai from "chai";
import path from "path";
import fs from "fs";

import { RouteEngine } from "../../lib";
import { DEFAULT_OPTIONS } from "../../lib/constants";

import { newRouteEngine } from "../../scripts/route-engine";
import { appCache, expectStatus, expectStatusDump, supertest } from "../../scripts/supertest";
import { destroyAllRoutes } from "../../scripts/route-removal";

const routeEngine = newRouteEngine();

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

  it("should throw an error if the 'context' is invalid", async () => {
    try {
      new RouteEngine(appCache.app, "my random context" as any);

      chai.expect.fail("Should have thrown an error");
    } catch (error) {
      chai.expect(error).to.be.an("error");
    }
  });

  it("should properly set the `app` and `context`", async () => {
    // @ts-ignore
    chai.expect(routeEngine.engine.$app).to.equal(appCache.app);
    // @ts-ignore
    chai.expect(routeEngine.engine.$context).to.equal("commonjs");
  });

  it("should set the default options", async () => {
    const engine = new RouteEngine(appCache.app, "commonjs");

    // @ts-ignore
    chai.expect(engine.$options).to.be.an("object");
    // @ts-ignore
    chai.expect(engine.$options).to.deep.equal(DEFAULT_OPTIONS);
  });

  describe("when registering routes", () => {
    it("routes that are declared as 'registered' should return a 200", async () => {
      const registry = await routeEngine.engine.run();

      await expectStatusDump(registry, 200);
    });

    it("routes that are not declared as 'registered' should return a 404", async () => {
      const registry = await routeEngine.engine.run();

      for (const route of registry) {
        if (route.status !== "registered" && !route.route_options.paramsRegex) {
          for (const layer of route.layers) {
            await supertest().get(layer.complete_path).expect(404);
          }
        }
      }
    });

    it("should set the status to 'skipped' if the file is empty", async () => {
      const registry = await routeEngine.engine.run();

      const errorRoute = registry.find((route) => route.base_path === null);

      chai.expect(errorRoute).to.be.an("object");
      chai.expect(errorRoute?.status).to.equal("skipped");
      chai.expect(errorRoute?.error).to.equal("Most likely forgot to export a default function.");
    });

    it("should throw an error if the file is empty when using `strictMode`", async () => {
      try {
        routeEngine.engine.setOptions(
          routeEngine.mergeOptions({
            strictMode: true
          })
        );

        await routeEngine.engine.run();

        chai.expect.fail("Should have thrown an error");
      } catch (error) {
        chai.expect(error).to.be.an("error");
      }
    });

    it("should convert the slug to a regex", async () => {
      const registry = await routeEngine.engine.run();

      const customSchema = registry.find((route) => route.absolute_path.includes("[custom]"));
      const nestedSchema = registry.find((route) => route.absolute_path.includes("[nested]"));

      if (customSchema) {
        chai.expect(customSchema.base_path.endsWith("/:custom")).to.equal(true);
      }

      if (nestedSchema) {
        chai.expect(nestedSchema.base_path.endsWith("/:nested/:token")).to.equal(true);
      }
    });

    it("should remove the directory from the base path", async () => {
      const registry = await routeEngine.engine.run();

      for (const route of registry) {
        if (route.base_path) {
          chai
            .expect(route.base_path.startsWith(routeEngine.engine.absoluteDirectory))
            .to.equal(false);
        }
      }
    });
  });
});
