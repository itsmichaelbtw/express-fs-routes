/**
    * https://github.com/itsmichaelbtw/express-fs-routes#readme
    * (c) 2023 Orison Networks
    * @license MIT
    */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const merge = require('lodash.merge');

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
function isBoolean(value) {
  return typeof value === "boolean";
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

const SLUG_REGEX = /\[(.*?)\]/gi;
const EXPRESS_PARAMS_TOKEN = ":";
const WILD_CARD_TOKEN = "*";
process.env.NODE_ENV || "development";
const OUTPUT_DIRECTORY = ".fs-routes";
const MAX_SAFE_PROMISES = 100;
const DEFAULT_OPTIONS = {
  directory: "routes",
  appMount: "",
  routeMetadata: {},
  environmentRoutes: undefined,
  indexNames: ["index.js"],
  output: OUTPUT_DIRECTORY,
  strictMode: false,
  redactOutputFilePaths: false,
  beforeRegistration: route => route,
  customMiddleware: null,
  interceptLayerStack: null
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
function parseRouteHandlerOptions(options) {
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
    type: component,
    extension: path.extname(relativePath)
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
async function createDirectoryTree(dir) {
  const directory = readDirectorySync(dir);
  if (directory.length === 0) {
    return newComponentEntry(dir, "directory");
  }
  const resolvedPath = dir;
  const componentEntry = newComponentEntry(resolvedPath, "directory");
  const treeNode = await asyncReduce(directory, async (tree, file) => {
    const filePath = path.join(resolvedPath, file);
    const fileStats = await stats(filePath);
    if (fileStats.isDirectory()) {
      const child = await createDirectoryTree(filePath);
      if (child) {
        tree.children.push(child);
      }
    } else if (fileStats.isFile()) {
      const isFile = FILE_FILTER.test(file);
      if (isFile) {
        const fileEntry = newComponentEntry(filePath, "file");
        tree.children.push(fileEntry);
      }
    }
    return tree;
  }, componentEntry);
  return treeNode;
}

/**
 * Flattens the given tree node and filters out
 * all nodes that are not files.
 *
 * @param treeNode The tree node to flatten.
 * @returns The flattened tree node.
 */
function flattenTreeNode(treeNode) {
  const flattenTree = [];
  function flatten(node) {
    flattenTree.push(node);
    if (node.children) {
      node.children.forEach(flatten);
    }
  }
  flatten(treeNode);
  return flattenTree.filter(node => node.type === "file");
}

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
    } catch (error) {}
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

function getRouteOptions(handler) {
  if (handler && isObject(handler.routeOptions)) {
    return parseRouteHandlerOptions(handler.routeOptions);
  }
  return DEFAULT_ROUTE_OPTIONS;
}
class Engine {
  constructor(app, context) {
    if (!app) {
      throw new TypeError("No 'app' was provided to the RouteEngine constructor");
    }
    if (context !== "commonjs" && context !== "module") {
      throw new TypeError("The 'context' provided to the RouteEngine constructor is invalid");
    }
    this.$app = app;
    this.$context = context;
    this.$registry = [];
    this.setOptions(DEFAULT_OPTIONS);
  }

  /**
   * The default output directory for the route
   * registry and tree node files.
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
   * Returns the absolute directory that is being used
   * to register routes.
   */
  get absoluteDirectory() {
    return this.$currentDirectory;
  }

  /**
   * Sets the options for the route registration.
   *
   * @param options The options to set.
   */
  setOptions(options) {
    this.$options = parseRouteRegistrationOptions(options);
    if (path.isAbsolute(this.options.directory)) {
      this.$currentDirectory = this.options.directory;
    } else {
      this.$currentDirectory = path.resolve(process.cwd(), this.options.directory);
    }
    if (this.options.strictMode) {
      const exists = fs.existsSync(this.$currentDirectory);
      if (!exists) {
        throw new Error(`The directory '${this.$currentDirectory}' does not exist.`);
      }
    }
  }

  /**
   * Registers the given tree node as a route. This
   * method is called recursively for each file in
   * the directory tree. Alternatively, you can call
   * this method with a file path to register a single
   * route.
   *
   * @param node The tree node to register.
   * @returns The route schema.
   */
  async registerRoute(node) {
    try {
      const routeHandler = await this.requireHandler(node.absolute_path, node.extension);
      const schema = this.createRouteSchema(routeHandler, node, schema => {
        if (routeHandler === null) {
          schema.status = "skipped";
          schema.error = "Most likely forgot to export a default function.";
        }
        return schema;
      });
      if (routeHandler) {
        this.useRouteSchema(routeHandler, schema);
      } else {
        this.append(schema);
      }
      return schema;
    } catch (error) {
      if (this.options.strictMode) {
        throw new Error(`Failed to register route for file '${node.absolute_path}': ${error.message}`);
      }
      const schema = this.createRouteSchema(null, node, schema => {
        schema.status = "error";
        schema.error = error.message;
        return schema;
      });
      this.append(schema);
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
  async requireHandler(path, extension) {
    const filePath = this.transformFilePath(path, extension);
    let handler = await import(filePath);
    if (typeof handler.default !== "function") {
      if (this.options.strictMode) {
        throw new Error(`The default export of a route must be a function. Found at: ${path}`);
      }
      return null;
    }
    const routeOptions = handler.routeOptions;
    handler = handler.default;
    handler.routeOptions = routeOptions;
    if (handler && handler.__esModule) {
      if (typeof handler.default !== "function") {
        if (this.options.strictMode) {
          throw new Error(`The default export of a route must be a function. Found at: ${path}`);
        }
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

  /**
   * Creates a new route schema for the given handler and
   * file entry.
   *
   * @param routeHandler The router handler.
   * @param schema The file entry.
   * @param modifier The route modifier.
   * @returns The route schema.
   */
  createRouteSchema(routeHandler, schema, modifier) {
    const baseSchema = {
      absolute_path: schema.absolute_path,
      base_path: null,
      layers: [],
      route_options: {},
      status: null
    };
    if (routeHandler === null || isEmpty(routeHandler.stack)) {
      if (isFunction(modifier)) {
        return modifier(baseSchema, {});
      }
      return baseSchema;
    }
    const basePath = this.createRouteUrl(routeHandler, schema);
    const layers = [];
    for (const layer of routeHandler.stack) {
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
      function createPathExtension() {
        if (path === "/") {
          return basePath;
        }
        return basePath + path;
      }
      const method = layerMethod();
      const completePath = createPathExtension();
      const routerLayer = {
        method: method,
        middleware_count: stack.length,
        extended_path: path,
        complete_path: completePath
      };
      if (this.options.interceptLayerStack) {
        for (const [index, middleware] of stack.entries()) {
          const newHandler = this.options.interceptLayerStack(Object.assign({}, routerLayer), middleware.handle, index, routerLayer.middleware_count);
          if (isFunction(newHandler)) {
            stack[index].handle = newHandler;
          }
        }
      }
      layers.push(routerLayer);
    }
    baseSchema.layers = layers;
    baseSchema.base_path = basePath;
    if (this.options.routeMetadata) {
      merge(routeHandler.routeOptions.metadata, this.options.routeMetadata);
    }
    baseSchema.route_options = routeHandler.routeOptions;
    if (isFunction(modifier)) {
      return modifier(baseSchema, routeHandler.routeOptions);
    }
    return baseSchema;
  }

  /**
   * Converts the given route handler into a route schema and appends
   * it to the route registry. All associated layers within
   * the routes stack are also processed and appended to the registry.
   *
   * @param routeHandler The route handler that was required.
   * @param schema The file entry from the directory scan.
   * @param modifier A function that modifies the route schema.
   * @returns An array of route schemas.
   */
  createRouteUrl(routeHandler, schema) {
    let routePath = removeFileExtension(schema.absolute_path);
    if (routePath.startsWith(this.$currentDirectory)) {
      routePath = routePath.replace(this.$currentDirectory, "");
    }
    routePath = routePath.replace(/\\/g, "/");
    if (!!this.options.appMount) {
      const appMount = ensureLeadingToken(this.options.appMount, "/");
      routePath = ensureLeadingToken(routePath, appMount);
    }
    if (routeHandler.routeOptions.isIndex === null) {
      for (const indexName of this.options.indexNames) {
        const resolved = removeFileExtension(indexName);
        const basename = path.basename(routePath);
        if (basename === resolved) {
          routePath = path.dirname(routePath);
          break;
        }
      }
    } else if (routeHandler.routeOptions.isIndex) {
      const basename = path.basename(routePath);
      const base = ensureLeadingToken(basename, "/").replace(/\/$/, "");
      if (base !== this.options.appMount) {
        routePath = routePath.replace(base, "");
      }
    }
    if (routePath.endsWith("/")) {
      routePath = routePath.replace(/\/$/, "");
    }
    routePath = this.paramsReplacement(routePath, routeHandler.routeOptions.paramsRegex);
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
   * @param routeHandler The route handler.
   * @param routeSchema The route schema.
   */
  useRouteSchema(routeHandler, routeSchema) {
    const hookRouteSchema = this.options.beforeRegistration(routeSchema);
    this.append(routeSchema);
    if (!isObject(hookRouteSchema)) {
      routeSchema.error = "The `beforeRegistration` hook returned an invalid value.";
      routeSchema.status = "error";
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
        this.assignMiddleware(routeHandler, hookRouteSchema);
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
   * @param routeSchema The route schema to check.
   * @param callback The callback to invoke.
   */
  environmentBasedRegistration(routeSchema, callback) {
    if (isArray(routeSchema.route_options.environments)) {
      const proceed = routeSchema.route_options.environments.some(env => {
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
          if (routeSchema.absolute_path.startsWith(resolved)) {
            if (!proceed) {
              proceed = nodeEnv === getCurrentWorkingEnvironment();
            }
          }
          if (proceed) {
            break;
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
   * Attempts to replace any slug parameters with
   * the provided regex pattern. Otherwise, the
   * default Express parameter token is used.
   *
   * @param url The URL to replace the slugs in.
   * @param paramsRegex The regex pattern to use.
   * @returns The modified URL.
   */
  paramsReplacement(url, paramsRegex) {
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
   * Uses the given route handler middleware. Undergoes
   * a registration hook to allow for any modifications to the
   * route schema and handler.
   *
   * @param route The route schema.
   * @param handler The route handler.
   */
  assignMiddleware(routeHandler, routeSchema) {
    if (this.options.customMiddleware) {
      this.$app.use.call(this.$app, routeSchema.base_path, this.options.customMiddleware(Object.assign({}, routeSchema), routeHandler));
      return;
    }
    function middleware(req, res, next) {
      req.routeMetadata = routeSchema.route_options.metadata;
      routeHandler.call(this.$app, req, res, next);
    }
    this.$app.use.call(this.$app, routeSchema.base_path, middleware.bind(this));
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
    return path.resolve(this.$currentDirectory, filePath);
  }

  /**
   * Transforms the file path depending on the context
   * and current operating system.
   *
   * @param filePath The file path to transform.
   */
  transformFilePath(filePath, extension) {
    const platform = os.platform();
    if (platform === "win32") {
      filePath = filePath.replace(/\\/g, "/");
      if (this.$context === "module" || extension === ".js") {
        return `file://${filePath}`;
      }
      return filePath;
    }
    if (!filePath.startsWith("/")) {
      filePath = `/${filePath}`;
    }
    return filePath;
  }

  /**
   * Appends the newly made route schema to the registry.
   *
   * @param routeSchema The route schema to append.
   */
  append(routeSchema) {
    this.$registry.push(routeSchema);
  }

  /**
   * Clears the route registry.
   */
  clear() {
    this.$registry = [];
  }
}
class RouteEngine extends Engine {
  constructor(app, context) {
    super(app, context);
  }

  /**
   * Saves the output of the route registry and tree node
   * files to the given output directory. If the `redactOutputFilePaths`
   * option is set to true, the file paths will be redacted.
   *
   * @param tree The tree node.
   * @returns The route registry.
   */
  async save(tree) {
    const output = this.options.output;
    const redact = this.options.redactOutputFilePaths;
    const registry = this.registry;
    if (!isString(output) || !registry.length) {
      return;
    }
    const localFileSave = new LocalFileSave(output);
    localFileSave.save({
      json: tree,
      fileName: TREE_NODE_FILENAME
    }, initRedactFn(redact, "tree-node"));
    localFileSave.save({
      json: registry,
      fileName: REGISTRY_FILENAME
    }, initRedactFn(redact, "router-registry"));
  }

  /**
   * Runs the route engine, reading the directory tree
   * and registering the routes. If you have indicated
   * the output directory, the route registry and tree
   * node files will be saved.
   *
   * @returns The route registry.
   */
  async run() {
    try {
      this.clear();
      const treeNode = await createDirectoryTree(this.absoluteDirectory);
      const flattenTree = flattenTreeNode(treeNode);
      async function createSafePromises() {
        function createPromise(nodes) {
          const promises = nodes.map(node => {
            return this.registerRoute.call(this, node);
          });
          return promises;
        }
        if (flattenTree.length < MAX_SAFE_PROMISES) {
          const promises = createPromise.call(this, flattenTree);
          await Promise.all(promises);
          return;
        }
        for (let i = 0; i < flattenTree.length; i += MAX_SAFE_PROMISES) {
          const chunk = flattenTree.slice(i, i + MAX_SAFE_PROMISES);
          const promises = createPromise.call(this, chunk);
          await Promise.all(promises);
        }
      }
      await createSafePromises.call(this);
      await this.save(treeNode);
      return this.registry;
    } catch (error) {
      if (this.options.strictMode) {
        throw error;
      }
    }
  }
}

exports.RouteEngine = RouteEngine;
//# sourceMappingURL=fs-routes.cjs.js.map
