import http from "http";
import path from "path";
import express from "express";
import { pathToRegexp } from "path-to-regexp";

import type {
    DirectoryEnsemble,
    DirectoryCallback,
    FilePath,
    RouteHandler,
    RouteHandlerOptions,
    DirTree,
    RouteSchema
} from "./types";

import { createDirectoryTree } from "./directory-tree";
import { checkOutputDir, saveOutputToDisk } from "./output";
import {
    isEmpty,
    isObject,
    ensureLeadingToken,
    ensureTrailingToken,
    removeFileExtension,
    isArray
} from "./utils";
import { debug, DebugColors } from "./debug";

type ExpressApp = express.Express;

type EnvironmentRoutes = {
    [key: string]: FilePath[];
};

interface RouteRegistrationOptions {
    /**
     * The root directory that contains all routes you wish to register.
     * You may pass a relative path, or an absolute path. If you pass a relative path,
     * it will be resolved relative to `__dirname`.
     *
     * Defaults to `routes`.
     */
    directory: FilePath;
    /**
     * An optional app mount that is appended to the start of each route.
     *
     * For example, if you are building an application that will be hosted at
     * `https://example.com/api`, you would set this to `/api` to indicate that
     * all routes should be mounted at `/api`.
     *
     * This is designed to eliminate the need to specify a directory for app mounts.
     *
     * Defaults to an empty string.
     */
    appMount?: string | null;
    /**
     * Define any routes that are specific to a certain environment. This
     * is resolved relative to the `directory` option.
     *
     * ```
     * {
     *   environmentRoutes: {
     *     development: ["users", "posts"],
     *     production: ["users"],
     *     test: ["users", "posts", "comments"],
     *     staging: ["users", "posts"],
     *     custom_env: ["foo", "bar"]
     *   }
     * }
     * ```
     *
     * If you instead wish to use the root directory as the environment, you must
     * instead pass an absolute path. E.g. `path.join(__dirname, "routes")`.
     *
     * Note: Only accepts directories.
     */
    environmentRoutes?: EnvironmentRoutes;
    /**
     * Sometimes you may want to specify routes that act upon the root
     * of a directory.
     *
     * For example, if you have a directory structure like this:
     *
     * ```
     * routes/
     *  users/
     *    index.js
     *    retrieve.js
     * ```
     *
     * You can tell `registerRoutes` to treat `index.js` as the root of the
     * `users` directory.
     *
     * Note: Only accepts filenames.
     *
     * Defaults to `[ "index.js" ]`.
     */
    indexNames?: string[];
    /**
     * Express parameters are supported by default. This allows you to specify
     * a folder or file that will be used as a paramater.
     *
     * For example, if you have a route at `routes/users/:id/retrieve`,
     * you can specify `id` as a parameter.
     *
     * Filepath: `routes/users/#id/retrieve.js`
     *
     * You may optionally specify a custom params token that will be used to
     * test for parameters.
     *
     * Defaults to `#`.
     */
    paramsToken?: string | RegExp;
    /**
     * Specify a directory to save a JSON file that contains a tree of all
     * registered routes, and a registry of all route handlers. This is useful
     * for debugging purposes.
     *
     * Set this to `false` to disable this feature.
     *
     * Defaults to `.fs-routes`.
     */
    output?: string | false | null;
    /**
     * Whether errors should be thrown. If this is set to `false`, operations will
     * continue as normal.
     *
     * Defaults to `false`.
     */
    silent?: boolean;
}

const DEFAULT_OPTIONS: RouteRegistrationOptions = {
    directory: "routes",
    appMount: "",
    indexNames: ["index.js"],
    paramsToken: "#",
    output: ".fs-routes",
    silent: false
};

const EXPRESS_PARAMS_TOKEN = ":";
const EXPRESS_BASE_REGEX = /^\/?$/i;
const WILD_CARD_TOKEN = "*";
const CURRENT_ENVIRONMENT = process.env.NODE_ENV || "development";

function convertPathRegex(path: FilePath): RegExp {
    return pathToRegexp(path);
}

function formulateTokenRegex(token: string | RegExp | null): RegExp {
    if (token) {
        if (token instanceof RegExp) {
            return token;
        } else if (typeof token === "string") {
            return new RegExp(token, "g");
        }
    }

    return new RegExp(/#/, "g");
}

function getRouteOptions(handler: RouteHandler): RouteHandlerOptions {
    // each individual handler exports a property called `routeOptions`
    // which controls the route's behavior when it is registered.

    if (handler && handler.routeOptions && isObject(handler.routeOptions)) {
        if (!handler.routeOptions.environments) {
            handler.routeOptions.environments = WILD_CARD_TOKEN;
        }

        return handler.routeOptions;
    }

    return { environments: WILD_CARD_TOKEN };
}

function parseHandler(handler: any, path: FilePath): RouteHandler | null {
    const errorMessage = `The default export of a route must be a function. Found at: ${path}`;
    function handleNonFunction(): void {
        debugOrThrowError(errorMessage, "red");
    }

    // convert an es6 module to a commonjs module if necessary
    // this way all modules are treated the same
    if (handler && handler.__esModule) {
        if (typeof handler.default !== "function") {
            handleNonFunction();
            return null;
        }

        handler.default.routeOptions = handler.routeOptions;
        handler = handler.default;
    }

    // by default, the default export of a route should be a function
    // if this is not the case, throw an error
    if (typeof handler !== "function") {
        handleNonFunction();
        return null;
    }

    handler.routeOptions = getRouteOptions(handler);
    return handler;
}

function debugOrThrowError(message: string, color: DebugColors): void {
    if (debugOrThrowError.silent) {
        return debug(message, color);
    } else {
        throw new Error(message);
    }
}

debugOrThrowError.silent = DEFAULT_OPTIONS.silent;

function mergeWithDefaults(options: RouteRegistrationOptions): RouteRegistrationOptions {
    if (!isObject(options)) {
        return DEFAULT_OPTIONS;
    }

    const opts = Object.assign({}, DEFAULT_OPTIONS, options);

    if (typeof opts.directory !== "string") {
        opts.directory = DEFAULT_OPTIONS.directory;
    }

    if (typeof opts.appMount !== "string" && opts.appMount !== null) {
        opts.appMount = DEFAULT_OPTIONS.appMount;
    }

    if (!isObject(opts.environmentRoutes)) {
        opts.environmentRoutes = {};
    }

    if (!isArray(opts.indexNames)) {
        opts.indexNames = DEFAULT_OPTIONS.indexNames;
    }

    if (typeof opts.output !== "string" && opts.output !== false && opts.output !== null) {
        opts.output = DEFAULT_OPTIONS.output;
    }

    if (typeof opts.silent !== "boolean") {
        opts.silent = DEFAULT_OPTIONS.silent;
    }

    return opts;
}

export function registerRoutes(app: ExpressApp, options: RouteRegistrationOptions): void {
    options = mergeWithDefaults(options);

    debugOrThrowError.silent = options.silent;

    const routeRegistry: RouteSchema[] = [];

    const resolvedDirectory = path.resolve(options.directory);
    const tree = createDirectoryTree(resolvedDirectory, onFile);

    function appendToRegistry(route: RouteSchema): void {
        routeRegistry.push(route);
    }

    function addRoute(route: RouteSchema, handler: RouteHandler): void {
        const expressApp = app.use.bind(app);

        const directoryEnvironments = options.environmentRoutes[CURRENT_ENVIRONMENT];
        const routeEnvironments = route.routeOptions.environments;

        // will want to make these 2 arrays work together

        // if (isArray(directoryEnvironments) && !isEmpty(directoryEnvironments)) {
        //     for (const directory of directoryEnvironments) {
        //         const directoryPath = path.resolve(resolvedDirectory, directory);

        //         if (route.absolutePath.startsWith(directoryPath)) {
        //             route.status = "skipped";
        //             route.message = `Route is in a directory that is disabled for the current environment: ${CURRENT_ENVIRONMENT}`;

        //             return appendToRegistry(route);
        //         }
        //     }
        // }

        expressApp(route.url, handler);

        route.status = "registered";
        routeRegistry.push(route);
    }

    function createRouteUrl(relativePath: string, urlModifier: (url: string) => string): string {
        let routePath = removeFileExtension(relativePath);

        for (const indexName of options.indexNames) {
            const name = removeFileExtension(indexName);

            if (routePath.endsWith(name)) {
                routePath = routePath.replace(name, "");
            }
        }

        if (routePath.startsWith(resolvedDirectory)) {
            routePath = routePath.replace(resolvedDirectory, "");
        }

        routePath = routePath.replace(/\\/g, "/");

        if (!!options.appMount) {
            const appMount = ensureLeadingToken(options.appMount, "/");
            routePath = ensureLeadingToken(routePath, appMount);
        }

        if (routePath.endsWith("/")) {
            routePath = routePath.slice(0, -1);
        }

        return urlModifier(routePath);
    }

    function createRouteSchema(
        handler: RouteHandler | null,
        fileEntry: DirectoryEnsemble,
        modifier: (path: RouteSchema, routeOptions: RouteHandlerOptions) => RouteSchema
    ): RouteSchema {
        const baseSchema: RouteSchema = {
            method: null,
            absolutePath: fileEntry.path,
            routeOptions: {},
            status: null,
            url: null
        };

        if (handler === null) {
            return modifier(baseSchema, {});
        }

        const handlerStack = handler.stack[0];
        const routeOptions = handler.routeOptions;
        const method = handlerStack.route.stack[0].method.toUpperCase();
        const extendedUrl = handlerStack.route.path;

        const routeUrl = createRouteUrl(fileEntry.path, (url) => {
            if (routeOptions.isIndex) {
                const base = ensureLeadingToken(path.basename(url), "/").replace(/\/$/, "");

                if (base !== options.appMount) {
                    url = url.replace(base, "");
                }
            }

            // if a route has an internal url, for now this works
            // but I am not comfortable with changing the url that
            // is managed by express

            // future
            // if an internal URL is present, only use the relative path
            // and let express handle the rest
            // what about saving it as json?
            // have a new key that represents the extended url

            // express doubles up on the path

            if (extendedUrl && extendedUrl !== "/") {
                url = url + extendedUrl;
                handler.stack[0].regexp = EXPRESS_BASE_REGEX;
                handler.stack[0].route.path = "/";
            }

            const paramsTokenReplacer = formulateTokenRegex(options.paramsToken);
            url = url.replace(paramsTokenReplacer, EXPRESS_PARAMS_TOKEN);

            return ensureLeadingToken(url, "/");
        });

        const schema = Object.assign({}, baseSchema, {
            method: method,
            routeOptions: routeOptions,
            url: routeUrl
        });

        return modifier(schema, routeOptions);
    }

    function onFile(fileEntry: DirectoryEnsemble): void {
        try {
            const requireHandler: RouteHandler = require(fileEntry.path);

            if (isEmpty(requireHandler)) {
                const schema = createRouteSchema(null, fileEntry, (schema) => {
                    schema.status = "skipped";
                    schema.error = "File is empty.";
                    return schema;
                });
                appendToRegistry(schema);
                return debugOrThrowError(`Route handler at ${fileEntry.path} is empty.`, "yellow");
            }

            const routeHandler = parseHandler(requireHandler, fileEntry.path);
            const routeSchema = createRouteSchema(routeHandler, fileEntry, (schema) => {
                if (routeHandler === null) {
                    schema.status = "error";
                }

                return schema;
            });

            if (routeHandler) {
                addRoute(routeSchema, routeHandler);
            } else {
                appendToRegistry(routeSchema);
            }
        } catch (error: any) {
            const schema = createRouteSchema(null, fileEntry, (schema) => {
                schema.status = "error";
                schema.error = error.message;

                return schema;
            });
            appendToRegistry(schema);
            debugOrThrowError(error.message, "red");
        }
    }

    if (typeof options.output === "string" && options.output) {
        checkOutputDir(options.output, (dir: string) => {
            saveOutputToDisk(dir, routeRegistry, "route_registry.json");
            saveOutputToDisk(dir, tree, "directory_tree.json");
        });
    }
}

// create a visualis representation of all api routes that are registered
