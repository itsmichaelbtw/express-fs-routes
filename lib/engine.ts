import type { NextFunction, Request, Response } from "express";
import type {
  RouteSchema,
  RouterOptions,
  RegistrationOptions,
  RouteRegistry,
  FilePath,
  MetaData,
  TreeNode,
  RouteHandler,
  FileExtension,
  RouteLayer,
  Methods,
  ParamsRegex,
  ExpressMiddleware
} from "./types";

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import deepmerge from "deepmerge";

import { parseRouteRegistrationOptions, parseRouteHandlerOptions } from "./parse-options";
import { createDirectoryTree, flattenTreeNode } from "./directory-tree";
import { LocalFileSave, initRedactFn } from "./save-to-json";
import {
  isString,
  isEmpty,
  isObject,
  isFunction,
  isUndefined,
  isArray,
  removeFileExtension,
  ensureLeadingToken,
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
  REGISTRY_FILENAME,
  MAX_SAFE_PROMISES
} from "./constants";

type ExpressApp = express.Application;
type Context = "commonjs" | "module";
type RouteModifier = (routerSchema: RouteSchema, routeOptions: RouterOptions) => RouteSchema;

function getRouteOptions(handler: RouteHandler): RouterOptions {
  if (handler && isObject(handler.routeOptions)) {
    return parseRouteHandlerOptions(handler.routeOptions);
  }

  return DEFAULT_ROUTE_OPTIONS;
}

class Engine {
  private readonly $app: ExpressApp;
  private readonly $context: Context;

  protected $registry: RouteRegistry;
  protected $options: RegistrationOptions;
  protected $currentDirectory: string;

  constructor(app: ExpressApp, context: Context) {
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
  public get options(): RegistrationOptions {
    return this.$options;
  }

  /**
   * Returns the route registry.
   */
  public get registry(): RouteRegistry {
    return this.$registry;
  }

  /**
   * Returns the absolute directory that is being used
   * to register routes.
   */
  public get absoluteDirectory(): string {
    return this.$currentDirectory;
  }

  /**
   * Sets the options for the route registration.
   *
   * @param options The options to set.
   */
  public setOptions(options: RegistrationOptions): void {
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
  public async registerRoute(node: TreeNode): Promise<RouteSchema> {
    try {
      const routeHandler = await this.requireHandler(node.absolute_path, node.extension);

      const schema = this.createRouteSchema(routeHandler, node, (schema) => {
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
        throw new Error(
          `Failed to register route for file '${node.absolute_path}': ${error.message}`
        );
      }

      const schema = this.createRouteSchema(null, node, (schema) => {
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
  protected async requireHandler(path: FilePath, extension: FileExtension): Promise<RouteHandler> {
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
  protected createRouteSchema(
    routeHandler: RouteHandler,
    schema: TreeNode,
    modifier?: RouteModifier
  ): RouteSchema {
    const baseSchema: RouteSchema = {
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

    const layers: RouteLayer[] = [];

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

      const routerLayer: RouteLayer = {
        method: method as Methods,
        middleware_count: stack.length,
        extended_path: path,
        complete_path: completePath
      };

      if (this.options.interceptLayerStack) {
        for (const [index, middleware] of stack.entries()) {
          const newHandler = this.options.interceptLayerStack(
            Object.assign({}, routerLayer),
            middleware.handle,
            index,
            routerLayer.middleware_count
          );

          if (isFunction(newHandler)) {
            stack[index].handle = newHandler;
          }
        }
      }

      layers.push(routerLayer);
    }

    baseSchema.layers = layers;
    baseSchema.base_path = basePath;
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
  protected createRouteUrl(routeHandler: RouteHandler, schema: TreeNode): string {
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
   * @param routerSchema The route schema.
   */
  protected useRouteSchema(routeHandler: RouteHandler, routerSchema: RouteSchema): void {
    const hookRouteSchema = this.options.beforeRegistration(routerSchema);

    this.append(routerSchema);

    if (!isObject(hookRouteSchema)) {
      routerSchema.error = "The `beforeRegistration` hook returned an invalid value.";
      routerSchema.status = "error";

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
   * @param RouterSchema The route schema to check.
   * @param callback The callback to invoke.
   */
  protected environmentBasedRegistration(
    routerSchema: RouteSchema,
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
   * Attempts to replace any slug parameters with
   * the provided regex pattern. Otherwise, the
   * default Express parameter token is used.
   *
   * @param url The URL to replace the slugs in.
   * @param paramsRegex The regex pattern to use.
   * @returns The modified URL.
   */
  protected paramsReplacement(url: string, paramsRegex: ParamsRegex): string {
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
   * Uses the given route handler middleware. Undergoes
   * a registration hook to allow for any modifications to the
   * route schema and handler.
   *
   * @param route The route schema.
   * @param handler The route handler.
   */
  protected assignMiddleware(routeHandler: RouteHandler, routeSchema: RouteSchema): void {
    if (this.options.customMiddleware) {
      this.$app.use.call(
        this.$app,
        routeSchema.base_path,
        this.options.customMiddleware(Object.assign({}, routeSchema), routeHandler)
      );
      return;
    }

    function middleware(this: RouteEngine, req: Request, res: Response, next: NextFunction) {
      const metadata = routeSchema.route_options.metadata ?? DEFAULT_ROUTE_OPTIONS.metadata;
      const deepMerged = deepmerge(this.options.routeMetadata, metadata);
      req.routeMetadata = deepMerged;

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
  public resolveFilePath(filePath: FilePath): FilePath {
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
  public transformFilePath(filePath: FilePath, extension: FileExtension): FilePath {
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
   * @param routerSchema The route schema to append.
   */
  public append(routerSchema: RouteSchema): void {
    this.$registry.push(routerSchema);
  }

  /**
   * Clears the route registry.
   */
  public clear(): void {
    this.$registry = [];
  }
}

export class RouteEngine extends Engine {
  constructor(app: ExpressApp, context: Context) {
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
  private async save(tree: TreeNode): Promise<void> {
    const output = this.options.output;
    const redact = this.options.redactOutputFilePaths;
    const registry = this.registry;

    if (!isString(output) || !registry.length) {
      return;
    }

    const localFileSave = new LocalFileSave(output);

    localFileSave.save(
      {
        json: tree,
        fileName: TREE_NODE_FILENAME
      },
      initRedactFn(redact, "tree-node")
    );

    localFileSave.save(
      {
        json: registry,
        fileName: REGISTRY_FILENAME
      },
      initRedactFn(redact, "router-registry")
    );
  }

  /**
   * Runs the route engine, reading the directory tree
   * and registering the routes. If you have indicated
   * the output directory, the route registry and tree
   * node files will be saved.
   *
   * @returns The route registry.
   */
  public async run<T extends MetaData>(): Promise<RouteRegistry<T>> {
    try {
      this.clear();

      const treeNode = await createDirectoryTree(this.absoluteDirectory);
      const flattenTree = flattenTreeNode(treeNode);

      async function createSafePromises(this: RouteEngine) {
        function createPromise(this: RouteEngine, nodes: TreeNode[]) {
          const promises = nodes.map((node) => {
            return this.registerRoute.call(this, node) as RouteEngine["registerRoute"];
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
