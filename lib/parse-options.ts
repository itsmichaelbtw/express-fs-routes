import type { RegistrationOptions, RouterOptions } from "./types";

import { isObject, isArray, isFunction, isString, isBoolean, isEmpty } from "./utils";
import { DEFAULT_OPTIONS, DEFAULT_ROUTE_OPTIONS } from "./constants";

export function parseRouteRegistrationOptions(options: RegistrationOptions): RegistrationOptions {
  if (!isObject(options)) {
    return DEFAULT_OPTIONS;
  }

  const opts = Object.assign({}, DEFAULT_OPTIONS, options);

  if (!isString(opts.directory)) {
    opts.directory = DEFAULT_OPTIONS.directory;
  }

  if (!isString(opts.appMount) && opts.appMount !== null) {
    opts.appMount = DEFAULT_OPTIONS.appMount;
  }

  if (!isArray(opts.indexNames)) {
    opts.indexNames = DEFAULT_OPTIONS.indexNames;
  }

  if (!isString(opts.output) && opts.output !== false && opts.output !== null) {
    opts.output = DEFAULT_OPTIONS.output;
  }

  if (!isObject(opts.environmentRoutes) && opts.environmentRoutes !== undefined) {
    opts.environmentRoutes = {};
  }

  if (!isBoolean(opts.redactOutputFilePaths)) {
    opts.redactOutputFilePaths = DEFAULT_OPTIONS.redactOutputFilePaths;
  }

  if (!isBoolean(opts.strictMode)) {
    opts.strictMode = DEFAULT_OPTIONS.strictMode;
  }

  if (!isObject(opts.routeMetadata)) {
    opts.routeMetadata = {};
  }

  if (!isFunction(opts.beforeRegistration)) {
    opts.beforeRegistration = DEFAULT_OPTIONS.beforeRegistration;
  }

  if (!isFunction(opts.customMiddleware)) {
    opts.customMiddleware = null;
  }

  if (!isFunction(opts.interceptLayerStack)) {
    opts.interceptLayerStack = null;
  }

  return opts;
}

export function parseRouteHandlerOptions(options: RouterOptions): RouterOptions {
  if (!isObject(options)) {
    return DEFAULT_ROUTE_OPTIONS;
  }

  const opts = Object.assign({}, DEFAULT_ROUTE_OPTIONS, options);

  if (opts.environments !== undefined) {
    if (isString(opts.environments)) {
      opts.environments = [opts.environments];
    } else if (!isArray(opts.environments) || isEmpty(opts.environments)) {
      opts.environments = DEFAULT_ROUTE_OPTIONS.environments;
    }
  } else {
    opts.environments = DEFAULT_ROUTE_OPTIONS.environments;
  }

  if (!isEmpty(options.paramsRegex) && isObject(options.paramsRegex)) {
    for (const pathName in options.paramsRegex) {
      const pathRegex = options.paramsRegex[pathName];

      if (isString(pathRegex)) {
        continue;
      }

      if (pathRegex instanceof RegExp) {
        options.paramsRegex[pathName] = pathRegex.source;
      } else {
        delete options.paramsRegex[pathName];
      }
    }
  } else {
    opts.paramsRegex = {};
  }

  if (!isObject(options.metadata)) {
    opts.metadata = {};
  }

  return opts;
}
