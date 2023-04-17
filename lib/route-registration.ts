import path from "path";
import express from "express";

import type {
  TreeNode,
  FilePath,
  RouterHandler,
  RouterOptions,
  RouterSchema,
  RouterRegistry,
  RouteRegistrationOptions,
  ParamsRegex,
  RouterLayer,
  Methods,
  ExpressMiddleware
} from "./types";

import { createDirectoryTree } from "./directory-tree";
import { LocalFileSave, initRedactFn } from "./save-to-json";
import {
  isEmpty,
  isObject,
  ensureLeadingToken,
  removeFileExtension,
  isArray,
  isFunction,
  isUndefined,
  isString,
  getCurrentWorkingEnvironment
} from "./utils";
import {
  DEFAULT_OPTIONS,
  DEFAULT_ROUTE_OPTIONS,
  EXPRESS_PARAMS_TOKEN,
  WILD_CARD_TOKEN,
  SLUG_REGEX,
  OUTPUT_DIRECTORY,
  TREE_NODE_FILENAME,
  REGISTRY_FILENAME
} from "./constants";
import { parseRouteRegistrationOptions, parseRouterHandlerOptions } from "./parse-options";
import { debug, DebugColors } from "./debug";

type ExpressApp = express.Application;
type RouteRegistrationContext = "commonjs" | "module";
type RouteModifier = (routerSchema: RouterSchema, routeOptions: RouterOptions) => RouterSchema;

function getRouteOptions(handler: RouterHandler): RouterOptions {
  // each individual handler exports a property called `routeOptions`
  // which controls the route's behavior when it is registered.

  // create a default route options and merge it with the handler's
  // route options.

  if (handler && handler.routeOptions && isObject(handler.routeOptions)) {
    return parseRouterHandlerOptions(handler.routeOptions);
  }

  return DEFAULT_ROUTE_OPTIONS;
}

function debugOrThrowError(error: Error | string, color: DebugColors): void {
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
  private readonly $app: ExpressApp;
  private readonly $context: RouteRegistrationContext;

  protected $registry: RouterRegistry;
  protected $options: RouteRegistrationOptions;
  protected $activeDirectory: string;

  constructor(app: ExpressApp, context: RouteRegistrationContext) {
    if (!app) {
      throw new TypeError("No app was passed to the route engine.");
    }

    if (context !== "commonjs" && context !== "module") {
      throw new TypeError(
        "The engine expected a valid context. Must be either 'commonjs' or 'module'."
      );
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
  public get options(): RouteRegistrationOptions {
    return this.$options;
  }

  /**
   * Returns the route registry.
   */
  public get registry(): RouterRegistry {
    return this.$registry;
  }

  /**
   * Returns the absolute directory that is being used.
   */
  public get absoluteDirectory(): string {
    return this.$activeDirectory;
  }

  /**
   * Sets the options for the route registration.
   *
   * @param options The options to set.
   */
  public setOptions(options: RouteRegistrationOptions): void {
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
  public resolveFilePath(filePath: FilePath): FilePath {
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
  protected async onFile(fileEntry: TreeNode): Promise<void> {
    try {
      const routerHandler = await this.requireHandler(fileEntry.absolute_path);

      // If the route handler is null, it means that the file is empty
      // or something went wrong when requiring the file. In this case,
      // we skip the registration process but still append the route
      // to the registry.
      if (routerHandler === null) {
        const schema = this.newRouterSchema(null, fileEntry, (schema) => {
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
      const schema = this.newRouterSchema(null, fileEntry, (schema) => {
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
  protected async requireHandler(path: FilePath): Promise<RouterHandler | null> {
    function handleNonFunction(): void {
      debugOrThrowError(
        `The default export of a route must be a function. Found at: ${path}`,
        "red"
      );
    }

    let handler: any | null = null;

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

  protected newRouterSchema(
    routerHandler: RouterHandler,
    fileEntry: TreeNode,
    modifier?: RouteModifier
  ): RouterSchema {
    const baseSchema: RouterSchema = {
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

    const layers: RouterLayer[] = [];

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

      const routerLayer: RouterLayer = {
        method: method as Methods,
        middleware_count: stack.length,
        extended_path: path,
        complete_path: completePath
      };

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
  protected createRouteUrl(routerHandler: RouterHandler, fileEntry: TreeNode): string {
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
  protected useRouterSchema(routerHandler: RouterHandler, routerSchema: RouterSchema): void {
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

    this.environmentBasedRegistration(hookRouteSchema, (proceed) => {
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
  protected environmentBasedRegistration(
    routerSchema: RouterSchema,
    callback: (proceed: boolean) => void
  ): void {
    if (isUndefined(routerSchema.route_options)) {
      return callback(true);
    }

    if (isArray(routerSchema.route_options.environments)) {
      const proceed = routerSchema.route_options.environments.some((env) => {
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
  protected assignMiddleware(routerHandler: RouterHandler, routeSchema: RouterSchema): void {
    // if (this.$options.customMiddleware) {
    //     this.$app.use.call(
    //         this.$app,
    //         route.full_path,
    //         this.$options.customMiddleware(route, handler)
    //     );
    //     return;
    // }
    // const useMiddleware: RouteHandlerMiddleware = (req, res, next) => {
    //     console.log("request received");
    //     req.routeMetadata = route.route_options.metadata ?? DEFAULT_ROUTE_OPTIONS.metadata;
    //     handler.call(this.$app, req, res, next);
    // };
    // console.log(handler);
    // // need to figure instead use the method
    // this.$app.use.call(this.$app, handler.bind(this.$app));
    // this.$app.use.call(this.$app, route.full_path, (req, res, next) => {
    //     console.log("request received");
    //     // req.routeMetadata = route.route_options.metadata ?? DEFAULT_ROUTE_OPTIONS.metadata;
    //     handler.call(this.$app, req, res, next);
    // });
    // this.$app[route.method].call(
    //     this.$app,
    //     route.full_path,
    //     (req: Request, res: Response, next: NextFunction) => {
    //         console.log("request received");
    //         res.send("hello world");
    //         // req.routeMetadata = route.route_options.metadata ?? DEFAULT_ROUTE_OPTIONS.metadata;
    //         // handler.call(this.$app, req, res, next);
    //     }
    // );

    const middleware: ExpressMiddleware = (req, res, next) => {
      console.log("request received");

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
  protected replaceParamsRegExp(url: string, paramsRegex: ParamsRegex): string {
    if (isUndefined(paramsRegex)) {
      return url;
    }

    let modifiedUrl = url;
    let match: RegExpMatchArray | null = null;

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
  protected append(routerSchema: RouterSchema): void {
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
export class RouteEngine extends Engine {
  constructor(app: ExpressApp, context: RouteRegistrationContext) {
    super(app, context);
  }

  /**
   * Registers all available routes within a given directory.
   */
  public async registerRoutes(): Promise<RouterRegistry> {
    try {
      this.$registry = [];

      const directory = this.$activeDirectory;
      const tree = await createDirectoryTree(directory, this.onFile.bind(this));

      const output = this.options.output;
      const registry = this.registry;

      if (isString(output) && output.length) {
        const localOutput = new LocalFileSave(output);

        localOutput.save(
          {
            json: tree,
            fileName: TREE_NODE_FILENAME
          },
          initRedactFn(this.options.redactOutputFilePaths, "tree-node")
        );

        localOutput.save(
          {
            json: registry,
            fileName: REGISTRY_FILENAME
          },
          initRedactFn(this.options.redactOutputFilePaths, "router-registry")
        );
      }

      return registry;
    } catch (error) {
      debugOrThrowError(error, "red");
    }
  }

  // public async registerSingleRoute(): Promise<void> {}
}
