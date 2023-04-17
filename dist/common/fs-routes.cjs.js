/**
    * https://github.com/itsmichaelbtw/express-fs-routes#readme
    * (c) 2023 Orison Networks
    * @license MIT
    */

'use strict';

const path = require('path');
const fs = require('fs');

function isUndefined(value) {
  return typeof value === "undefined";
}
function isArray(value) {
  return Array.isArray(value);
}
function isObject(value) {
  return typeof value === "object" && value !== null && !isArray(value);
}
function isString(value) {
  return typeof value === "string";
}
function isFunction(value) {
  return typeof value === "function";
}
function isEmpty(value) {
  if (isArray(value)) {
    return value.length === 0;
  } else if (isObject(value)) {
    return Object.keys(value).length === 0;
  } else {
    return !value;
  }
}
function ensureLeadingToken(value, token) {
  if (!value.startsWith(token)) {
    return `${token}${value}`;
  }
  return value;
}
function removeFileExtension(value) {
  return value.replace(/\.[^/.]+$/, "");
}
function getCurrentWorkingEnvironment() {
  return process.env.NODE_ENV || "development";
}
async function asyncReduce(array, callback, initialValue) {
  let accumulator = initialValue;
  for (const current of array) {
    accumulator = await callback(accumulator, current);
  }
  return accumulator;
}

const FILE_FILTER = /^([^\.].*)(?<!\.d)\.(js|ts)$/;
function readDirectorySync(dirPath) {
  return fs.readdirSync(dirPath);
}
async function stats(filePath) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });
}
function newComponentEntry(relativePath, component) {
  const entry = {
    name: path.basename(relativePath),
    absolute_path: relativePath,
    type: component
  };
  if (component === "directory") {
    entry.children = [];
  }
  return entry;
}

/**
 * Creates a directory tree from a given directory path.
 *
 * @param dir The directory path.
 * @param onFile A callback function that is called for each file.
 * @returns A promise that resolves to a directory tree.
 */
async function createDirectoryTree(dir, onFile) {
  const directory = readDirectorySync(dir);
  if (directory.length === 0) {
    return newComponentEntry(dir, "directory");
  }
  const resolvedPath = dir;
  const componentEntry = newComponentEntry(resolvedPath, "directory");
  const TreeNode = await asyncReduce(directory, async (tree, file) => {
    const filePath = path.join(resolvedPath, file);
    const fileStats = await stats(filePath);
    if (fileStats.isDirectory()) {
      const child = await createDirectoryTree(filePath, onFile);
      if (child) {
        tree.children.push(child);
      }
    } else if (fileStats.isFile()) {
      const isFile = FILE_FILTER.test(file);
      if (isFile) {
        const fileEntry = newComponentEntry(filePath, "file");
        await onFile(fileEntry);
        tree.children.push(fileEntry);
      }
    }
    return tree;
  }, componentEntry);
  return TreeNode;
}

const colors = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  lightblue: "\x1b[36m"
};
const globals = {
  reset: "\x1b[0m",
  bright: "\x1b[1m"
};
function debug(message, color) {
  const prefix = "[EXPRESS-FS-ROUTES] ";
  const colorizedMessage = `${colors[color]}${prefix}${message}${globals.reset}`;
  console.log(colorizedMessage);
}

const SLUG_REGEX = /\[(.*?)\]/gi;
const EXPRESS_PARAMS_TOKEN = ":";
const WILD_CARD_TOKEN = "*";
process.env.NODE_ENV || "development";
const OUTPUT_DIRECTORY = ".fs-routes";
const DEFAULT_OPTIONS = {
  directory: "routes",
  appMount: "",
  indexNames: ["index.js"],
  output: OUTPUT_DIRECTORY,
  silent: false,
  environmentRoutes: undefined,
  redactOutputFilePaths: false,
  beforeRegistration: route => route
};
const DEFAULT_ROUTE_OPTIONS = {
  environments: null,
  isIndex: null,
  skip: false,
  paramsRegex: {},
  metadata: {}
};
const TREE_NODE_FILENAME = "tree-node.json";
const REGISTRY_FILENAME = "route-registry.json";
const REDACT_TOKEN = "...";

class LocalFileSave {
  constructor(directory) {
    this.directory = directory;
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }
  }
  save(data, redactionFn) {
    data.json = redactionFn(data.json);
    const filePath = path.resolve(path.join(this.directory, data.fileName));
    try {
      fs.writeFileSync(filePath, JSON.stringify(data.json, null, 2), {
        encoding: "utf8",
        flag: "w"
      });
    } catch (error) {
      debug(error, "red");
    }
  }
}
function initRedactFn(redact, jsonType) {
  return json => {
    if (!redact) {
      return json;
    }
    switch (jsonType) {
      case "router-registry":
        {
          const typeCast = json;
          return typeCast.map(entry => {
            return {
              ...entry,
              absolute_path: REDACT_TOKEN
            };
          });
        }
      case "tree-node":
        {
          const typeCast = json;
          const updatedNode = {
            ...typeCast,
            absolute_path: REDACT_TOKEN
          };
          if (isArray(typeCast.children)) {
            updatedNode.children = typeCast.children.map(child => {
              return initRedactFn(redact, jsonType)(child);
            });
          }
          return updatedNode;
        }
    }
  };
}

function parseRouteRegistrationOptions(options) {
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
  if (!isObject(opts.environmentRoutes)) {
    opts.environmentRoutes = {};
  }
  if (!isArray(opts.indexNames)) {
    opts.indexNames = DEFAULT_OPTIONS.indexNames;
  }
  if (!isString(opts.output) && opts.output !== false && opts.output !== null) {
    opts.output = DEFAULT_OPTIONS.output;
  }
  if (!isFunction(opts.beforeRegistration)) {
    opts.beforeRegistration = DEFAULT_OPTIONS.beforeRegistration;
  }
  if (!isFunction(opts.customMiddleware)) {
    opts.customMiddleware = null;
  }
  return opts;
}
function parseRouterHandlerOptions(options) {
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

function getRouteOptions(handler) {
  // each individual handler exports a property called `routeOptions`
  // which controls the route's behavior when it is registered.

  // create a default route options and merge it with the handler's
  // route options.

  if (handler && handler.routeOptions && isObject(handler.routeOptions)) {
    return parseRouterHandlerOptions(handler.routeOptions);
  }
  return DEFAULT_ROUTE_OPTIONS;
}
function debugOrThrowError(error, color) {
  if (debugOrThrowError.silent) {
    if (error instanceof Error) {
      error = error.message;
    }
    return debug(error, color);
  } else {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(error);
  }
}
debugOrThrowError.silent = DEFAULT_OPTIONS.silent;
class Engine {
  constructor(app, context) {
    if (!app) {
      throw new TypeError("No app was passed to the route engine.");
    }
    if (context !== "commonjs" && context !== "module") {
      throw new TypeError("The engine expected a valid context. Must be either 'commonjs' or 'module'.");
    }
    this.$app = app;
    this.$context = context;
    this.$registry = [];
    this.setOptions(DEFAULT_OPTIONS);
  }

  /**
   * The default output directory for the route registration.
   */
  static OUTPUT_DIRECTORY = OUTPUT_DIRECTORY;

  /**
   * Returns the options for the route registration.
   */
  get options() {
    return this.$options;
  }

  /**
   * Returns the route registry.
   */
  get registry() {
    return this.$registry;
  }

  /**
   * Returns the absolute directory that is being used.
   */
  get absoluteDirectory() {
    return this.$activeDirectory;
  }

  /**
   * Sets the options for the route registration.
   *
   * @param options The options to set.
   */
  setOptions(options) {
    this.$options = parseRouteRegistrationOptions(options);
    if (path.isAbsolute(this.$options.directory)) {
      this.$activeDirectory = this.$options.directory;
    } else {
      this.$activeDirectory = path.resolve(process.cwd(), this.$options.directory);
    }
    debugOrThrowError.silent = this.$options.silent;
  }

  /**
   * Resolves the given file path to an absolute path
   * relative to the directory that is being used.
   *
   * @param filePath The file path to resolve.
   * @returns The resolved file path.
   */
  resolveFilePath(filePath) {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.$activeDirectory, filePath);
  }

  /**
   * An asynchronous function that is called for every file that the
   * directory scan finds. This is responsible for requiring the file
   * and transforming it into a route handler.
   *
   * @param fileEntry The file entry.
   * @returns A promise that resolves to void.
   */
  async onFile(fileEntry) {
    try {
      const routerHandler = await this.requireHandler(fileEntry.absolute_path);

      // If the route handler is null, it means that the file is empty
      // or something went wrong when requiring the file. In this case,
      // we skip the registration process but still append the route
      // to the registry.
      if (routerHandler === null) {
        const schema = this.newRouterSchema(null, fileEntry, schema => {
          schema.status = "skipped";
          schema.error = "Most likely forgot to export a default function.";
          return schema;
        });
        this.append(schema);
        return debugOrThrowError(`Route handler at ${fileEntry.absolute_path} is empty.`, "red");
      }
      const routerSchema = this.newRouterSchema(routerHandler, fileEntry);
      this.useRouterSchema(routerHandler, routerSchema);
    } catch (error) {
      const schema = this.newRouterSchema(null, fileEntry, schema => {
        schema.status = "error";
        schema.error = error.message;
        return schema;
      });
      this.append(schema);
      debugOrThrowError(error, "red");
    }
  }

  /**
   * Attempts to load the route handler from the given path and uses
   * the given context to determine how to load the file. If the file
   * exports the `routeOptions` property, this will be parsed and
   * attached to the route handler.
   *
   * @param path The path to the route handler.
   * @returns The route handler or null if the file is empty.
   */
  async requireHandler(path) {
    function handleNonFunction() {
      debugOrThrowError(`The default export of a route must be a function. Found at: ${path}`, "red");
    }
    let handler = null;
    try {
      if (this.$context === "module") {
        handler = await import(ensureLeadingToken(path, "file://"));
        if (typeof handler.default !== "function") {
          handleNonFunction();
          return null;
        }
        const routeOptions = handler.routeOptions;
        handler = handler.default;
        handler.routeOptions = routeOptions;
      } else if (this.$context === "commonjs") {
        handler = require(path);
      }
    } catch (error) {
      debugOrThrowError(error, "red");
    }

    // only for typescript compatibility
    if (handler && handler.__esModule) {
      if (typeof handler.default !== "function") {
        handleNonFunction();
        return null;
      }
      handler.default.routeOptions = handler.routeOptions;
      handler = handler.default;
    }
    if (isEmpty(handler)) {
      return null;
    }
    handler.routeOptions = getRouteOptions(handler);
    return handler;
  }
  newRouterSchema(routerHandler, fileEntry, modifier) {
    const baseSchema = {
      absolute_path: fileEntry.absolute_path,
      base_path: null,
      layers: [],
      route_options: {},
      status: null
    };
    if (routerHandler === null || isEmpty(routerHandler.stack)) {
      if (isFunction(modifier)) {
        return modifier(baseSchema, {});
      }
      return baseSchema;
    }
    const basePath = this.createRouteUrl(routerHandler, fileEntry);
    const layers = [];
    for (const layer of routerHandler.stack) {
      const route = layer.route;
      const path = route.path;
      const stack = route.stack;
      function layerMethod() {
        const routeMethodKey = Object.keys(route.methods);
        if (routeMethodKey.length) {
          return routeMethodKey[0];
        }
        return "unknown";
      }
      function fullPath() {
        if (path === "/") {
          return basePath;
        }
        return basePath + path;
      }
      const method = layerMethod();
      const completePath = fullPath();
      const routerLayer = {
        method: method,
        middleware_count: stack.length,
        extended_path: path,
        complete_path: completePath
      };
      if (this.$options.interceptLayerStack) {
        for (const [index, middleware] of stack.entries()) {
          const newHandler = this.$options.interceptLayerStack(routerLayer, middleware.handle, index, routerLayer.middleware_count);
          if (isFunction(newHandler)) {
            stack[index].handle = newHandler;
          }
        }
      }
      layers.push(routerLayer);
    }
    baseSchema.layers = layers;
    baseSchema.base_path = basePath;
    baseSchema.route_options = routerHandler.routeOptions;
    if (isFunction(modifier)) {
      return modifier(baseSchema, routerHandler.routeOptions);
    }
    return baseSchema;
  }

  /**
   * Converts the given route handler into a route schema and appends
   * it to the route registry. All associated layers within
   * the routes stack are also processed and appended to the registry.
   *
   * @param routerHandler The route handler that was required.
   * @param fileEntry The file entry from the directory scan.
   * @param modifier A function that modifies the route schema.
   * @returns An array of route schemas.
   */
  createRouteUrl(routerHandler, fileEntry) {
    let routePath = removeFileExtension(fileEntry.absolute_path);
    if (routePath.startsWith(this.$activeDirectory)) {
      routePath = routePath.replace(this.$activeDirectory, "");
    }
    routePath = routePath.replace(/\\/g, "/");
    if (!!this.options.appMount) {
      const appMount = ensureLeadingToken(this.options.appMount, "/");
      routePath = ensureLeadingToken(routePath, appMount);
    }
    if (routerHandler.routeOptions.isIndex === null) {
      for (const indexName of this.options.indexNames) {
        const resolved = removeFileExtension(indexName);
        const basename = path.basename(routePath);
        if (basename === resolved) {
          routePath = path.dirname(routePath);
          break;
        }
      }
    } else if (routerHandler.routeOptions.isIndex) {
      const basename = path.basename(routePath);
      const base = ensureLeadingToken(basename, "/").replace(/\/$/, "");
      if (base !== this.options.appMount) {
        routePath = routePath.replace(base, "");
      }
    }
    if (routePath.endsWith("/")) {
      routePath = routePath.replace(/\/$/, "");
    }
    routePath = this.replaceParamsRegExp(routePath, routerHandler.routeOptions.paramsRegex);
    return ensureLeadingToken(routePath, "/");
  }

  /**
   * Uses the given route schema to register the route
   * with the Express application. This uses the `beforeRegistration`
   * hook to allow for any modifications to the route schema.
   *
   * Environmented based registration is also performed to determine
   * if the route should be registered in the current environment.
   *
   * @param routerHandler The route handler.
   * @param routerSchema The route schema.
   */
  useRouterSchema(routerHandler, routerSchema) {
    const hookRouteSchema = this.$options.beforeRegistration(routerSchema);
    this.append(routerSchema);
    if (!isObject(hookRouteSchema)) {
      routerSchema.error = "The `beforeRegistration` hook returned an invalid value.";
      routerSchema.status = "error";
      debugOrThrowError(routerSchema.error, "red");
      return;
    }
    if (hookRouteSchema.route_options.skip) {
      hookRouteSchema.status = "skipped";
      hookRouteSchema.message = "Route was skipped by the `routeOptions.skip` flag";
      return;
    }
    this.environmentBasedRegistration(hookRouteSchema, proceed => {
      const environment = getCurrentWorkingEnvironment();
      if (proceed) {
        this.assignMiddleware(routerHandler, hookRouteSchema);
        hookRouteSchema.status = "registered";
        hookRouteSchema.message = `Route was registered successfully for ${environment}`;
      } else {
        hookRouteSchema.status = "skipped";
        hookRouteSchema.message = `Route was skipped for ${environment}`;
      }
    });
  }

  /**
   * Performs environment based checking on the route schema
   * and determines if the route should be registered in the
   * current environment.
   *
   * @param RouterSchema The route schema to check.
   * @param callback The callback to invoke.
   */
  environmentBasedRegistration(routerSchema, callback) {
    if (isUndefined(routerSchema.route_options)) {
      return callback(true);
    }
    if (isArray(routerSchema.route_options.environments)) {
      const proceed = routerSchema.route_options.environments.some(env => {
        return env === WILD_CARD_TOKEN || env === getCurrentWorkingEnvironment();
      });
      return callback(proceed);
    }
    if (isUndefined(this.options.environmentRoutes) || isEmpty(this.options.environmentRoutes)) {
      return callback(true);
    }
    let proceed = null;
    for (const nodeEnv in this.options.environmentRoutes) {
      const directories = this.options.environmentRoutes[nodeEnv];
      if (isArray(directories)) {
        for (const filePath of directories) {
          const resolved = this.resolveFilePath(filePath);
          if (routerSchema.absolute_path.startsWith(resolved)) {
            if (proceed === false || proceed === null) {
              proceed = nodeEnv === getCurrentWorkingEnvironment();
            }
          }
        }
      }
    }
    if (proceed === null) {
      callback(true);
    } else {
      callback(proceed);
    }
  }

  /**
   * Uses the given route handler middleware. Undergoes
   * a registration hook to allow for any modifications to the
   * route schema and handler.
   *
   * @param route The route schema.
   * @param handler The route handler.
   */
  assignMiddleware(routerHandler, routeSchema) {
    // fix double call when using / as base path

    if (this.$options.customMiddleware) {
      this.$app.use.call(this.$app, routeSchema.base_path, this.$options.customMiddleware(routeSchema, routerHandler));
      return;
    }
    const middleware = (req, res, next) => {
      req.routeMetadata = routeSchema.route_options.metadata ?? DEFAULT_ROUTE_OPTIONS.metadata;
      routerHandler.call(this.$app, req, res, next);
    };
    this.$app.use.call(this.$app, routeSchema.base_path, middleware);
  }

  /**
   * Attempts to replace any slug parameters with
   * the provided regex pattern. Otherwise, the
   * default Express parameter token is used.
   *
   * @param url The URL to replace the slugs in.
   * @param paramsRegex The regex pattern to use.
   * @returns The modified URL.
   */
  replaceParamsRegExp(url, paramsRegex) {
    if (isUndefined(paramsRegex)) {
      return url;
    }
    let modifiedUrl = url;
    let match = null;
    while ((match = SLUG_REGEX.exec(url)) !== null) {
      const [slug, name] = match;
      let regexReplacer = `${EXPRESS_PARAMS_TOKEN}${name}`;
      if (paramsRegex[name]) {
        regexReplacer += `(${paramsRegex[name]})`;
      }
      modifiedUrl = modifiedUrl.replace(slug, regexReplacer);
    }
    return modifiedUrl;
  }

  /**
   * Appends the newly made route schema to the registry.
   *
   * @param routerSchema The route schema to append.
   */
  append(routerSchema) {
    this.$registry.push(routerSchema);
  }
}

/**
 * Initializes a new instance of the RouteEngine class
 * that is used to register all available routes within
 * a given directory.
 *
 * @param app The express application instance.
 * @param context The context in which the routes are being registered.
 *
 * @example
 * ```typescript
 * import express from "express";
 *
 * import { RouteEngine } from "express-fs-routes";
 *
 * const app = express();
 * const fsRoutes = new RouteEngine(app, "module");
 *
 * fsRoutes.setOptions({ ... })
 *
 * await fsRoutes.registerRoutes();
 * ```
 */
class RouteEngine extends Engine {
  constructor(app, context) {
    super(app, context);
  }

  /**
   * Registers all available routes within a given directory.
   */
  async registerRoutes() {
    try {
      this.$registry = [];
      const directory = this.$activeDirectory;
      const tree = await createDirectoryTree(directory, this.onFile.bind(this));
      const output = this.options.output;
      const registry = this.registry;
      if (isString(output) && output.length) {
        const localOutput = new LocalFileSave(output);
        localOutput.save({
          json: tree,
          fileName: TREE_NODE_FILENAME
        }, initRedactFn(this.options.redactOutputFilePaths, "tree-node"));
        localOutput.save({
          json: registry,
          fileName: REGISTRY_FILENAME
        }, initRedactFn(this.options.redactOutputFilePaths, "router-registry"));
      }
      return registry;
    } catch (error) {
      debugOrThrowError(error, "red");
    }
  }

  // public async registerSingleRoute(): Promise<void> {}
}

exports.RouteEngine = RouteEngine;
//# sourceMappingURL=fs-routes.cjs.js.map
