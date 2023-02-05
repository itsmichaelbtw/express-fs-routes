import http from "http";
import path from "path";
import express from "express";

import type {
    DirectoryTree,
    FilePath,
    RouteHandler,
    RouterOptions,
    RouteSchema,
    RouteRegistry,
    RouteRegistrationOptions,
    ParamsRegex
} from "./types";

import { createDirectoryTree } from "./directory-tree";
import { Redact, Output } from "./output";
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
    OUTPUT_DIRECTORY
} from "./constants";
import { parseRouteRegistrationOptions, parseRouterHandlerOptions } from "./parse-options";
import { debug, DebugColors } from "./debug";

type ExpressApp = express.Application;
type RouteRegistrationContext = "commonjs" | "module";
type RouteModifier<T, U> = (path: T, routeOptions: RouterOptions) => U;

function getRouteOptions(handler: RouteHandler): RouterOptions {
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

    protected $routeRegistry: RouteRegistry;
    protected $options: RouteRegistrationOptions;
    protected $resolveDirectory: string;

    constructor(app: ExpressApp, context: RouteRegistrationContext) {
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
    public get options(): RouteRegistrationOptions {
        return this.$options;
    }

    /**
     * Returns the route registry.
     */
    public get registry(): RouteRegistry {
        return this.$routeRegistry;
    }

    /**
     * Returns the absolute directory that is being used.
     */
    public get absoluteDirectory(): string {
        return this.$resolveDirectory;
    }

    /**
     * Sets the options for the route registration.
     *
     * @param options The options to set.
     */
    public setOptions(options: RouteRegistrationOptions): void {
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
    public resolveFilePath(filePath: FilePath): FilePath {
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
    protected async onFile(fileEntry: DirectoryTree): Promise<void> {
        try {
            const routeHandler = await this.requireHandler(fileEntry.absolute_path);

            // If the route handler is null, it means that the file is empty
            // or something went wrong when requiring the file. In this case,
            // we skip the registration process but still append the route
            // to the registry.
            if (routeHandler === null) {
                const schema = this.createRouteSchema(null, fileEntry, (schema) => {
                    schema.status = "skipped";
                    schema.error = "Likely a function is not the default export.";
                    return schema;
                });

                this.appendToRegistry(schema);
                return debugOrThrowError(
                    `Route handler at ${fileEntry.absolute_path} is empty.`,
                    "red"
                );
            }

            const routeSchema = this.createRouteSchema(routeHandler, fileEntry);
            this.bindRoutes(routeSchema, routeHandler);
        } catch (error) {
            const schema = this.createRouteSchema(null, fileEntry, (schema) => {
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
    protected async requireHandler(path: FilePath): Promise<RouteHandler | null> {
        function handleNonFunction(): void {
            debugOrThrowError(
                `The default export of a route must be a function. Found at: ${path}`,
                "red"
            );
        }

        let handler: any | null = null;

        if (this.$context === "commonjs") {
            handler = require(path);
        } else if (this.$context === "module") {
            handler = await import(path);
        }

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
    protected createRouteSchema(
        handler: RouteHandler | null,
        fileEntry: DirectoryTree,
        modifier?: RouteModifier<RouteSchema, RouteSchema>
    ): RouteRegistry {
        const baseSchema: RouteSchema = {
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

        const schemas: RouteRegistry = [];

        for (const layer of handler.stack) {
            const route = layer.route;
            const extendedPath = route.path;
            const method = route.stack[0].method;

            const merged: RouteSchema = {
                ...baseSchema,
                method: method,
                route_options: handler.routeOptions
            };

            const schemaURL = this.createRouteURL(
                fileEntry.absolute_path,
                merged.route_options,
                (url) => {
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
                }
            );

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
    protected createRouteURL(
        absolutePath: string,
        routeOptions: RouterOptions,
        modifier: RouteModifier<string, string>
    ): string {
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
    protected paramsRegexReplacement(url: string, paramsRegex: ParamsRegex): string {
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
     * Performs environment based checking on the route schema
     * and determines if the route should be registered in the
     * current environment.
     *
     * @param routeSchema The route schema to check.
     * @param callback The callback to invoke.
     */
    protected environmentBaseRegistration(
        routeSchema: RouteSchema,
        callback: (proceed: boolean) => void
    ): void {
        const routeOptions = routeSchema.route_options;

        if (isUndefined(routeOptions)) {
            return callback(true);
        }

        if (isArray(routeOptions.environments)) {
            const proceed = routeOptions.environments.some((env) => {
                return env === WILD_CARD_TOKEN || env === getCurrentWorkingEnvironment();
            });

            return callback(proceed);
        }

        if (
            isUndefined(this.options.environmentRoutes) ||
            isEmpty(this.options.environmentRoutes)
        ) {
            return callback(true);
        }

        let proceed = null;

        for (const nodeEnv in this.options.environmentRoutes) {
            const environments = this.options.environmentRoutes[nodeEnv];

            if (isArray(environments)) {
                for (const filePath of environments) {
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
    protected bindRoutes(routes: RouteRegistry, handler: RouteHandler): void {
        for (const route of routes) {
            const routeOptions = route.route_options;

            if (routeOptions.skip) {
                route.status = "skipped";
                route.message = "Route was skipped by the `routeOptions.skip` flag";

                continue;
            }

            this.environmentBaseRegistration(route, (proceed) => {
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
    protected appendToRegistry(routes: RouteRegistry): void {
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
export class RouteEngine extends Engine {
    constructor(app: ExpressApp, context: RouteRegistrationContext) {
        super(app, context);
    }

    /**
     * Registers all available routes within a given directory.
     */
    public async registerRoutes(): Promise<RouteRegistry> {
        try {
            this.$routeRegistry = [];

            const directory = this.$resolveDirectory;
            const tree = await createDirectoryTree(directory, this.onFile.bind(this));

            const output = this.options.output;
            const registry = this.registry;

            if (isString(output) && output.length) {
                const redactFilePaths = this.options.redactOutputFilePaths;

                Output.ensureOutputDir(output, () => {
                    return [
                        {
                            data: Redact.routeRegistry(registry, redactFilePaths),
                            fileName: "route_registry.json"
                        },
                        {
                            data: Redact.routeTree(tree, redactFilePaths),
                            fileName: "route_tree.json"
                        }
                    ];
                });
            }

            return Promise.resolve(this.registry);
        } catch (error) {
            debugOrThrowError(error, "red");
        }
    }

    // public async registerSingleRoute(): Promise<void> {}
}
