/**
    * https://github.com/itsmichaelbtw/express-fs-routes#readme
    * (c) 2023 Orison Networks
    * @license MIT
    */

import path from 'path';
import fs from 'fs';

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
  const directoryTree = await asyncReduce(directory, async (tree, file) => {
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
  return directoryTree;
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

class Output {
  /**
   * Ensures the output directory exists and writes the files to it.
   *
   * @param directory The output directory.
   * @param callback The callback to generate the files.
   */
  static ensureOutputDir(directory, callback) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }
    const files = callback();
    for (const file of files) {
      try {
        const filePath = path.resolve(path.join(directory, file.fileName));
        fs.writeFileSync(filePath, JSON.stringify(file.data, null, 2), {
          encoding: "utf8",
          flag: "w"
        });
      } catch (error) {
        debug(error, "red");
      }
    }
  }
}
class Redact {
  /**
   * Redacts the absolute path from the route registry nodes.
   *
   * @param registry The route registry.
   * @param redact Whether to redact the absolute path.
   * @returns The redacted route registry.
   */
  static routeRegistry(registry, redact) {
    if (redact) {
      return registry.map(entry => {
        return {
          ...entry,
          absolute_path: "..."
        };
      });
    }
    return registry;
  }

  /**
   * Redacts the absolute path from the directory tree nodes.
   *
   * @param tree The directory tree.
   * @param redact Whether to redact the absolute path.
   * @returns The redacted directory tree.
   */
  static routeTree(tree, redact) {
    if (redact) {
      const updatedNode = {
        ...tree,
        absolute_path: "..."
      };
      if (isArray(tree.children)) {
        updatedNode.children = tree.children.map(child => {
          return Redact.routeTree(child, redact);
        });
      }
      return updatedNode;
    }
    return tree;
  }
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
  redactOutputFilePaths: false
};
const DEFAULT_ROUTE_OPTIONS = {
  environments: null,
  isIndex: null,
  skip: false,
  paramsRegex: {}
};

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

// function transformHandler(handler: any, path: FilePath): RouteHandler | null {
//     const errorMessage = `The default export of a route must be a function. Found at: ${path}`;
//     function handleNonFunction(): void {
//         debugOrThrowError(errorMessage, "red");
//     }

//     // convert an es6 module to a commonjs module if necessary
//     // this way all modules are treated the same
//     if (handler && handler.__esModule) {
//         if (typeof handler.default !== "function") {
//             handleNonFunction();
//             return null;
//         }

//         handler.default.routeOptions = handler.routeOptions;
//         handler = handler.default;
//     }

//     // by default, the default export of a route should be a function
//     // if this is not the case, throw an error
//     if (typeof handler !== "function") {
//         handleNonFunction();
//         return null;
//     }

//     handler.routeOptions = getRouteOptions(handler);
//     return handler;
// }

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
      throw new Error("No app was passed to the route engine.");
    }
    if (context !== "commonjs" && context !== "module") {
      throw new Error("The engine expected a valid context. Must be either 'commonjs' or 'module'.");
    }
    this.$app = app;
    this.$context = context;
    this.$routeRegistry = [];
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
    return this.$routeRegistry;
  }

  /**
   * Returns the absolute directory that is being used.
   */
  get absoluteDirectory() {
    return this.$resolveDirectory;
  }

  /**
   * Sets the options for the route registration.
   *
   * @param options The options to set.
   */
  setOptions(options) {
    this.$options = parseRouteRegistrationOptions(options);
    if (path.isAbsolute(this.$options.directory)) {
      this.$resolveDirectory = this.$options.directory;
    } else {
      this.$resolveDirectory = path.resolve(process.cwd(), this.$options.directory);
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
    return path.resolve(this.$resolveDirectory, filePath);
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
      const routeHandler = await this.requireHandler(fileEntry.absolute_path);

      // If the route handler is null, it means that the file is empty
      // or something went wrong when requiring the file. In this case,
      // we skip the registration process but still append the route
      // to the registry.
      if (routeHandler === null) {
        const schema = this.createRouteSchema(null, fileEntry, schema => {
          schema.status = "skipped";
          schema.error = "Likely a function is not the default export.";
          return schema;
        });
        this.appendToRegistry(schema);
        return debugOrThrowError(`Route handler at ${fileEntry.absolute_path} is empty.`, "red");
      }
      const routeSchema = this.createRouteSchema(routeHandler, fileEntry);
      this.bindRoutes(routeSchema, routeHandler);
    } catch (error) {
      const schema = this.createRouteSchema(null, fileEntry, schema => {
        schema.status = "error";
        schema.error = error.message;
        return schema;
      });
      this.appendToRegistry(schema);
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

  /**
   * Converts the given route handler into a route schema and appends
   * it to the route registry. All associated layers within
   * the routes stack are also processed and appended to the registry.
   *
   * @param handler The route handler that was required.
   * @param fileEntry The file entry from the directory scan.
   * @param modifier A function that modifies the route schema.
   * @returns An array of route schemas.
   */
  createRouteSchema(handler, fileEntry, modifier) {
    const baseSchema = {
      method: null,
      absolute_path: fileEntry.absolute_path,
      route_options: {},
      status: null,
      base_path: null,
      extended_path: null,
      full_path: null
    };
    if (handler === null || isEmpty(handler.stack)) {
      if (isFunction(modifier)) {
        return [modifier(baseSchema, {})];
      }
      return [baseSchema];
    }
    const schemas = [];
    for (const layer of handler.stack) {
      const route = layer.route;
      const extendedPath = route.path;
      const method = route.stack[0].method;
      const merged = {
        ...baseSchema,
        method: method,
        route_options: handler.routeOptions
      };
      const schemaURL = this.createRouteURL(fileEntry.absolute_path, merged.route_options, url => {
        if (handler.routeOptions.isIndex) {
          const basename = path.basename(url);
          const base = ensureLeadingToken(basename, "/").replace(/\/$/, "");
          if (base !== this.options.appMount) {
            url = url.replace(base, "");
          }
        }
        url = this.paramsRegexReplacement(url, merged.route_options.paramsRegex);
        merged.base_path = url;
        if (extendedPath && extendedPath !== "/") {
          url += extendedPath;
          merged.extended_path = extendedPath;
        }
        return ensureLeadingToken(url, "/");
      });
      merged.full_path = schemaURL;
      if (isFunction(modifier)) {
        const modified = modifier(merged, handler.routeOptions);
        schemas.push(modified);
      } else {
        schemas.push(merged);
      }
    }
    return schemas;
  }

  /**
   * Creates a route URL that is used to register
   * the route to the Express application.
   *
   * @param absolutePath The absolute path to the route handler.
   * @param routeOptions Any route options that were defined.
   * @param modifier A function that modifies the route URL.
   * @returns The route URL.
   */
  createRouteURL(absolutePath, routeOptions, modifier) {
    let routePath = removeFileExtension(absolutePath);
    if (routeOptions.isIndex == null) {
      for (const indexName of this.options.indexNames) {
        const resolved = removeFileExtension(indexName);
        const basename = path.basename(routePath);
        if (basename === resolved) {
          routePath = path.dirname(routePath);
          break;
        }
      }
    }
    if (routePath.startsWith(this.$resolveDirectory)) {
      routePath = routePath.replace(this.$resolveDirectory, "");
    }
    routePath = routePath.replace(/\\/g, "/");
    if (!!this.options.appMount) {
      const appMount = ensureLeadingToken(this.options.appMount, "/");
      routePath = ensureLeadingToken(routePath, appMount);
    }
    if (routePath.endsWith("/")) {
      routePath = routePath.replace(/\/$/, "");
    }
    const modified = modifier(routePath, routeOptions);
    return modified;
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
  paramsRegexReplacement(url, paramsRegex) {
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
   * Performs environment based checking on the route schema
   * and determines if the route should be registered in the
   * current environment.
   *
   * @param routeSchema The route schema to check.
   * @param callback The callback to invoke.
   */
  environmentBaseRegistration(routeSchema, callback) {
    const routeOptions = routeSchema.route_options;
    if (isUndefined(routeOptions)) {
      return callback(true);
    }
    if (isArray(routeOptions.environments)) {
      const proceed = routeOptions.environments.some(env => {
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
   * Binds the available routes to the Express application
   * and performs environment based checking.
   *
   * @param routes The routes to bind.
   * @param handler The route handler to bind.
   */
  bindRoutes(routes, handler) {
    for (const route of routes) {
      const routeOptions = route.route_options;
      if (routeOptions.skip) {
        route.status = "skipped";
        route.message = "Route was skipped by the `routeOptions.skip` flag";
        continue;
      }
      this.environmentBaseRegistration(route, proceed => {
        const environment = getCurrentWorkingEnvironment();
        if (proceed) {
          this.$app.use.call(this.$app, route.base_path, handler);
          route.status = "registered";
          route.message = `Route was registered successfully for ${environment}`;
        } else {
          route.status = "skipped";
          route.message = `Route was skipped for ${environment}`;
        }
      });
    }
    this.appendToRegistry(routes);
  }

  /**
   * Appends the given routes to the internal route registry.
   *
   * @param routes The routes to append.
   */
  appendToRegistry(routes) {
    for (const route of routes) {
      this.$routeRegistry.push(route);
    }
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
      this.$routeRegistry = [];
      const directory = this.$resolveDirectory;
      const tree = await createDirectoryTree(directory, this.onFile.bind(this));
      const output = this.options.output;
      const registry = this.registry;
      if (isString(output) && output.length) {
        const redactFilePaths = this.options.redactOutputFilePaths;
        Output.ensureOutputDir(output, () => {
          return [{
            data: Redact.routeRegistry(registry, redactFilePaths),
            fileName: "route_registry.json"
          }, {
            data: Redact.routeTree(tree, redactFilePaths),
            fileName: "route_tree.json"
          }];
        });
      }
      return Promise.resolve(this.registry);
    } catch (error) {
      debugOrThrowError(error, "red");
    }
  }

  // public async registerSingleRoute(): Promise<void> {}
}

export { RouteEngine };
//# sourceMappingURL=fs-routes.esm.js.map
