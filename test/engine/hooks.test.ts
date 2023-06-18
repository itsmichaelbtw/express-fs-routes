import type { RouteSchema, TreeNode } from "../../lib/types";

import chai from "chai";
import sinon from "sinon";
import path from "path";
import fs from "fs";

import { RouteEngine } from "../../lib";
import { DEFAULT_OPTIONS } from "../../lib/constants";

import { newRouteEngine } from "../../scripts/route-engine";
import { appCache, supertest } from "../../scripts/supertest";
import { destroyAllRoutes } from "../../scripts/route-removal";

const routeEngine = newRouteEngine();

describe("hooks", () => {
  afterEach(() => {
    destroyAllRoutes(appCache.app);
    routeEngine.engine.setOptions(routeEngine.cacheOptions);
  });

  describe("beforeRegistration", () => {
    it("should call the beforeRegistration hook with the route object", async () => {
      let called = false;

      const options = routeEngine.mergeOptions({
        beforeRegistration(route) {
          called = true;
          return route;
        }
      });

      routeEngine.engine.setOptions(options);

      await routeEngine.engine.run();

      chai.expect(called).to.be.true;
    });

    it("should modify the route object if changes are made in the hook", async () => {
      const options = routeEngine.mergeOptions({
        beforeRegistration(route) {
          route.base_path = "/my-new-path";
          route.route_options.metadata = {
            test: true
          };
          return route;
        }
      });

      routeEngine.engine.setOptions(options);

      const routes = await routeEngine.engine.run();

      for (const route of routes) {
        if (route.status === "registered") {
          chai.expect(route.base_path).to.equal("/my-new-path");
          chai.expect(route.route_options.metadata).to.deep.equal({
            test: true
          });
        }
      }
    });

    it("should set the status to `error` when a non-object is returned", async () => {
      let absolute = "";

      const options = routeEngine.mergeOptions({
        beforeRegistration(route) {
          absolute = route.absolute_path;
          return null;
        }
      });

      routeEngine.engine.setOptions(options);

      const routes = await routeEngine.engine.run();

      const schema = routes.find((route) => route.absolute_path === absolute);

      if (schema) {
        chai.expect(schema.status).to.equal("error");
      } else {
        chai.expect.fail("Should have found the route");
      }
    });

    it("should set the status to `skip` when manually defining in the route_options", async () => {
      let absolute = "";

      const options = routeEngine.mergeOptions({
        beforeRegistration(route) {
          absolute = route.absolute_path;
          route.route_options.skip = true;
          return route;
        }
      });

      routeEngine.engine.setOptions(options);

      const routes = await routeEngine.engine.run();

      const schema = routes.find((route) => route.absolute_path === absolute);

      if (schema) {
        chai.expect(schema.status).to.equal("skipped");
      } else {
        chai.expect.fail("Should have found the route");
      }
    });
  });

  describe("interceptLayerStack", () => {
    it("should call the interceptLayerStack hook with the layer, handle, currentIdx, and stackSize", async () => {
      let xLayer: object,
        xHandle: Function,
        xCurrentIdx: number,
        xStackSize: number = null;
      let called = false;

      const options = routeEngine.mergeOptions({
        interceptLayerStack(layer, handle, currentIdx, stackSize) {
          called = true;
          xLayer = layer;
          xHandle = handle;
          xCurrentIdx = currentIdx;
          xStackSize = stackSize;
          return handle;
        }
      });

      routeEngine.engine.setOptions(options);

      await routeEngine.engine.run();

      chai.expect(called).to.be.true;
      chai.expect(xLayer).to.be.an("object");
      chai.expect(xHandle).to.be.a("function");
      chai.expect(xCurrentIdx).to.be.a("number");
      chai.expect(xStackSize).to.be.a("number");
    });
  });

  describe("customMiddleware", () => {
    it("should call the customMiddleware hook with the route object and handler", async () => {
      let xRoute: RouteSchema,
        xHandler: Function = null;
      let called = false;

      const options = routeEngine.mergeOptions({
        customMiddleware(route, handler) {
          called = true;
          xRoute = route;
          xHandler = handler;
          return handler;
        }
      });

      routeEngine.engine.setOptions(options);

      await routeEngine.engine.run();

      chai.expect(called).to.be.true;
      chai.expect(xRoute).to.be.an("object");
      chai.expect(xHandler).to.be.a("function");
    });
  });
});
