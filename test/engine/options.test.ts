import chai from "chai";
import path from "path";
import merge from "lodash.merge";
import envAgent from "env-agent";

import { RouteEngine, RouteRegistry } from "../../lib";

import { newRouteEngine } from "../../scripts/route-engine";
import { appCache, supertest, expectStatus, expectStatusDump } from "../../scripts/supertest";
import { destroyAllRoutes } from "../../scripts/route-removal";

function join(...pathName: string[]): string {
  return path.join(__dirname, "..", ...pathName);
}
const routeEngine = newRouteEngine();

describe("route options", () => {
  afterEach(() => {
    destroyAllRoutes(appCache.app);
    routeEngine.engine.setOptions(routeEngine.cacheOptions);
  });

  describe("directory", () => {
    it("should accept relative paths", async () => {
      const options = routeEngine.mergeOptions({
        directory: "examples/mocha"
      });

      routeEngine.engine.setOptions(options);

      const routes = await routeEngine.engine.run();

      await expectStatusDump(routes, 200);
    });

    it("should accept absolute paths", async () => {
      const options = routeEngine.mergeOptions({
        directory: path.join(process.cwd(), "examples/mocha")
      });

      routeEngine.engine.setOptions(options);

      const routes = await routeEngine.engine.run();

      await expectStatusDump(routes, 200);
    });

    it('should default to "routes" if not provided', () => {
      const routeEngine = new RouteEngine(appCache.app, "commonjs");
      const endsWith = routeEngine.options.directory.endsWith("routes");

      chai.expect(endsWith).to.be.true;
    });

    it("should set the directory option to the provided value", () => {
      const options = routeEngine.mergeOptions({
        directory: "scripts"
      });

      routeEngine.engine.setOptions(options);

      const filePath = routeEngine.engine.resolveFilePath("");

      chai.expect(routeEngine.engine.absoluteDirectory).to.equal(filePath);
    });

    it("should throw an error if the directory does not exist", () => {
      try {
        const options = routeEngine.mergeOptions({
          directory: "non-existent-directory"
        });

        routeEngine.engine.setOptions(options);

        chai.assert.fail("Should have thrown an error");
      } catch (error) {
        chai.expect(true).to.be.true;
      }
    });
  });

  describe("appMount", () => {
    it("should append the `appMount` to the route path", async () => {
      const options = routeEngine.mergeOptions({
        appMount: "/api"
      });

      routeEngine.engine.setOptions(options);

      const routes = await routeEngine.engine.run();

      for (const route of routes) {
        if (route.status === "registered") {
          chai.expect(route.base_path).to.include("/api");
        }
      }
    });
  });

  describe("routeMetadata", () => {
    it("should merge metadata to the route", async () => {
      const options = routeEngine.mergeOptions({
        routeMetadata: {
          test: "test",
          nested: {
            value: [1, 2, 3]
          }
        }
      });

      routeEngine.engine.setOptions(options);

      const routes = await routeEngine.engine.run();

      for (const route of routes) {
        if (route.status === "registered") {
          const merged = merge(
            route.route_options.metadata,
            routeEngine.engine.options.routeMetadata
          );
          chai.expect(route.route_options.metadata).to.deep.equal(merged);
        }
      }
    });

    it("should return the route metadata", async () => {
      const options = routeEngine.mergeOptions({
        routeMetadata: {
          test: "test",
          nested: {
            value: [1, 2, 3]
          }
        }
      });

      routeEngine.engine.setOptions(options);

      const routes = await routeEngine.engine.run();

      const schema = routes.find((route) => route.base_path === "/handler_options/metadata");
      const request = await supertest().get(schema.base_path);

      chai.expect(request.body).to.deep.equal(schema.route_options.metadata);
    });
  });

  describe("environmentRoutes", () => {
    const development = "engine_options/environment_routes/development";
    const production = "engine_options/environment_routes/production";
    const mixed = "engine_options/environment_routes/mixed";

    it("should register the routes in the current environment", async () => {
      envAgent.set("NODE_ENV", "production", true);

      const options = routeEngine.mergeOptions({
        environmentRoutes: {
          development: [development],
          production: [production],
          test: [mixed]
        }
      });

      routeEngine.engine.setOptions(options);

      const routesOne = await routeEngine.engine.run();

      for (const route of routesOne) {
        if (route.base_path) {
          if (route.base_path.includes(development)) {
            chai.expect(route.status).to.equal("skipped");
          }

          if (route.base_path.includes(production)) {
            chai.expect(route.status).to.equal("registered");
          }

          if (route.base_path.includes(mixed)) {
            chai.expect(route.status).to.equal("skipped");
          }
        }
      }

      envAgent.set("NODE_ENV", "test", true);

      const routesTwo = await routeEngine.engine.run();

      for (const route of routesTwo) {
        if (route.base_path) {
          if (route.base_path.includes(development)) {
            chai.expect(route.status).to.equal("skipped");
          }

          if (route.base_path.includes(production)) {
            chai.expect(route.status).to.equal("skipped");
          }

          if (route.base_path.includes(mixed)) {
            chai.expect(route.status).to.equal("registered");
          }
        }
      }
    });

    it("should allow absolute paths", async () => {
      envAgent.set("NODE_ENV", "development", true);

      const options = routeEngine.mergeOptions({
        environmentRoutes: {
          development: [path.join(process.cwd(), "examples/mocha", development)],
          production: [path.join(process.cwd(), "examples/mocha", production)],
          test: [path.join(process.cwd(), "examples/mocha", mixed)]
        }
      });

      routeEngine.engine.setOptions(options);

      const routesOne = await routeEngine.engine.run();

      for (const route of routesOne) {
        if (route.base_path) {
          if (route.base_path.includes(development)) {
            chai.expect(route.status).to.equal("registered");
          }

          if (route.base_path.includes(production)) {
            chai.expect(route.status).to.equal("skipped");
          }

          if (route.base_path.includes(mixed)) {
            chai.expect(route.status).to.equal("skipped");
          }
        }
      }
    });
  });

  describe("indexNames", () => {});
});
