import type { RouteRegistrationOptions } from "../lib/types";

import path from "path";

import { RouteEngine } from "../lib";
import { appCache } from "./supertest";

const EXAMPLES_DIR = path.join(__dirname, "..", "examples/mocha");

interface NewRouteEngine {
  engine: RouteEngine;
  cacheOptions: RouteRegistrationOptions;
  mergeOptions(options: Partial<RouteRegistrationOptions>): RouteRegistrationOptions;
}

export function newRouteEngine(): NewRouteEngine {
  const engine = new RouteEngine(appCache.app, "commonjs");

  function mergeOptions(options: Partial<RouteRegistrationOptions>) {
    return Object.assign({}, engine.options, options);
  }

  engine.setOptions({
    directory: EXAMPLES_DIR,
    output: false,
    silent: true
  });

  const cacheOptions = engine.options;

  return { engine, cacheOptions, mergeOptions };
}
