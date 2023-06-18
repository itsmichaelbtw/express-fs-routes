import type { RegistrationOptions } from "../lib/types";

import path from "path";

import { RouteEngine } from "../lib";
import { appCache } from "./supertest";

const EXAMPLES_DIR = path.join(__dirname, "..", "examples/mocha");

interface NewRouteEngine {
  engine: RouteEngine;
  cacheOptions: RegistrationOptions;
  mergeOptions(options: Partial<RegistrationOptions>): RegistrationOptions;
}

export function newRouteEngine(context = "commonjs"): NewRouteEngine {
  const engine = new RouteEngine(appCache.app, context as any);

  function mergeOptions(options: Partial<RegistrationOptions>) {
    return Object.assign({}, engine.options, options);
  }

  engine.setOptions({
    directory: EXAMPLES_DIR,
    output: false,
    strictMode: false
  });

  const cacheOptions = engine.options;

  return { engine, cacheOptions, mergeOptions };
}
