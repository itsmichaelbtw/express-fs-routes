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
    RouteSchema,
    RouteEnvironmentMode
} from "./types";

import { createDirectoryTree } from "./directory-tree";
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
     * Define any routes that are specific to a `development` environment. This
     * is useful for testing routes that you don't want to be exposed in production.
     * These routes will still be traversed and registered, but will not be
     * available in `production` mode.
     *
     * Optionally, if you want granular control over this behaviour, you can
     * set the `developmentOnly` property on a route to `true`.
     *
     * This is resolved relative to the `directory` option.
     *
     * Note: Only accepts directories.
     */
    developmentRoutes?: string[];
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
     * Note: Only accepts files.
     *
     * Defaults to `[ "index.js" ]`.
     */
    indexNames?: string[];
    /**
     * All route urls will be registered as a string. Specify if you wish all urls to
     * be converted to a RegExp before being registered.
     *
     * Defaults to `false`.
     */
    regexURLs?: boolean;
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
    regexURLs: false,
    silent: false
};

const EXPRESS_PARAMS_TOKEN = ":";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV !== "production";

function convertPathRegex(path: FilePath): RegExp {
    return pathToRegexp(path);
}

function getRouteOptions(handler: RouteHandler): RouteHandlerOptions {
    // each individual handler expores a property called `routeOptions`
    // which controls the route's behavior when it is registered.

    if (handler && handler.routeOptions && isObject(handler.routeOptions)) {
        return handler.routeOptions;
    }

    return {};
}

function parseHandler(handler: any, path: FilePath): RouteHandler | null {
    function handleNonFunction(): void {
        debugOrThrowError(
            `The default export of a route must be a function. Found at: ${path}`,
            "red"
        );
    }

    if (handler && handler.__esModule) {
        if (typeof handler.default !== "function") {
            handleNonFunction();
            return null;
        }

        handler.default.routeOptions = handler.routeOptions;
        handler = handler.default;
    }

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

    if (!isArray(opts.developmentRoutes)) {
        opts.developmentRoutes = [];
    }

    if (!isArray(opts.indexNames)) {
        opts.indexNames = DEFAULT_OPTIONS.indexNames;
    }

    return opts;
}

export function registerRoutes(
    app: ExpressApp,
    options: RouteRegistrationOptions
): DirectoryEnsemble {
    options = mergeWithDefaults(options);

    debugOrThrowError.silent = options.silent;

    const routeRegistry: RouteSchema[] = [];

    const resolvedDirectory = path.resolve(options.directory);
    const tree = createDirectoryTree(resolvedDirectory, onFile);

    function addRoute(route: RouteSchema, handler: RouteHandler): void {
        const expressApp = app.use.bind(app);

        if (isProduction && route.environment === "development") {
            return;
        }

        expressApp(route.url, handler);

        routeRegistry.push(route);
    }

    function createRouteURL(path: string, urlModifier: Function): string {
        if (path.startsWith(resolvedDirectory)) {
            path = path.replace(resolvedDirectory, "");
        }

        path = removeFileExtension(path);
        path = path.replace(/\\/g, "/");

        if (!!options.appMount) {
            const appMount = ensureLeadingToken(options.appMount, "/");
            path = ensureLeadingToken(path, appMount);
        }

        for (const indexName of options.indexNames) {
            const name = removeFileExtension(indexName);

            if (path.endsWith(name)) {
                path = path.replace(name, "");
            }
        }

        return urlModifier(path);
    }

    function createRouteScheme(handler: RouteHandler, fileEntry: DirectoryEnsemble): RouteSchema {
        const routeOptions = handler.routeOptions;
        const method = handler.stack[0].route.stack[0].method.toUpperCase();

        const routeURL = createRouteURL(fileEntry.path, (url: string) => {
            if (routeOptions.isIndex) {
                const base = path.basename(url);
                url = url.replace(ensureLeadingToken(base, "/"), "");
            }

            function getToken(): RegExp {
                if (routeOptions.paramsToken) {
                    const pt = routeOptions.paramsToken;

                    if (pt instanceof RegExp) {
                        return pt;
                    }

                    return new RegExp(pt, "g");
                } else {
                    return new RegExp(/#/, "g");
                }
            }

            const token = getToken();

            url = url.replace(token, EXPRESS_PARAMS_TOKEN);

            if (url.endsWith("/")) {
                url = url.replace(/\/$/, "");
            }

            if (options.regexURLs) {
                url = convertPathRegex(url).toString();
            }

            return ensureLeadingToken(url, "/");
        });

        function identifyEnvironment(): RouteEnvironmentMode {
            if (routeOptions.developmentOnly) {
                return "development";
            }

            for (const devRoute of options.developmentRoutes) {
                const route = path.resolve(resolvedDirectory, devRoute);

                if (fileEntry.path.startsWith(route)) {
                    return "development";
                }
            }

            return "production";
        }

        const environmentMode = identifyEnvironment();

        const schema: RouteSchema = {
            method: method,
            url: routeURL,
            relativePath: fileEntry.path,
            routeOptions: routeOptions,
            environment: environmentMode,
            status: "registered"
        };

        return schema;
    }

    function onFile(fileEntry: DirectoryEnsemble): void {
        try {
            const requireHandler: RouteHandler = require(fileEntry.path);

            if (isEmpty(requireHandler)) {
                return debugOrThrowError(`Route handler at ${fileEntry.path} is empty.`, "yellow");
            }

            const routeHandler = parseHandler(requireHandler, fileEntry.path);

            if (routeHandler) {
                const routeSchema = createRouteScheme(routeHandler, fileEntry);
                addRoute(routeSchema, routeHandler);
            }
        } catch (error: any) {
            debugOrThrowError(error.message, "red");
        }
    }

    console.log(routeRegistry);

    return tree;
}

// create a visualis representation of all api routes that are registered
