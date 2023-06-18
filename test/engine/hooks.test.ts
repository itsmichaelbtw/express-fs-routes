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
          return route;
        }
      });

      routeEngine.engine.setOptions(options);

      const routes = await routeEngine.engine.run();

      chai.expect(routes[0].base_path).to.equal("/my-new-path");
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
