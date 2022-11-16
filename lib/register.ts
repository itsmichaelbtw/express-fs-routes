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
    RouteRegistry,
    RouteRegistrationOptions
} from "./types";

import { createDirectoryTree } from "./directory-tree";
import { checkOutputDir, saveOutputToDisk } from "./output";
import {
    isEmpty,
    isObject,
    ensureLeadingToken,
    ensureTrailingToken,
    removeFileExtension,
    isArray,
    isFunction,
    isUndefined,
    isString,
    forEach,
    getCurrentWorkingEnvironment
} from "./utils";
import {
    DEFAULT_OPTIONS,
    DEFAULT_ROUTE_OPTIONS,
    EXPRESS_BASE_REGEX,
    EXPRESS_PARAMS_TOKEN,
    WILD_CARD_TOKEN
} from "./constants";
import { parseRouteRegistrationOptions, parseRouterHandlerOptions } from "./parse-options";
import { debug, DebugColors } from "./debug";

type ExpressApp = express.Application;

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

    // create a default route options and merge it with the handler's
    // route options.

    if (handler && handler.routeOptions && isObject(handler.routeOptions)) {
        return parseRouterHandlerOptions(handler.routeOptions);
    }

    return DEFAULT_ROUTE_OPTIONS;
}

function transformHandler(handler: any, path: FilePath): RouteHandler | null {
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

export function registerRoutes(app: ExpressApp, options?: RouteRegistrationOptions): void {
    options = parseRouteRegistrationOptions(options);

    debugOrThrowError.silent = options.silent;

    const routeRegistry: RouteRegistry = [];

    const use = app.use;

    const CURRENT_ENVIRONMENT = getCurrentWorkingEnvironment();

    const resolvedDirectory = path.resolve(options.directory);
    const tree = createDirectoryTree(resolvedDirectory, onFile);

    function appendToRegistry(routes: RouteRegistry): void {
        for (const routeSchema of routes) {
            // @ts-expect-error
            routeSchema.routeOptions.notImplemented = !!routeSchema.routeOptions.notImplemented;

            routeRegistry.push(routeSchema);
        }
    }

    function addRoutes(routes: RouteRegistry, handler: RouteHandler): void {
        function environmentBasedRegistration(
            routeSchema: RouteSchema,
            callback: (proceed: boolean) => void
        ): void {
            const routeOptions = routeSchema.routeOptions;

            if (isUndefined(routeOptions.environments) && isEmpty(options.environmentRoutes)) {
                return callback(true);
            }

            if (isArray(routeOptions.environments)) {
                const proceed = routeOptions.environments.some((environment) => {
                    return environment === WILD_CARD_TOKEN || environment === CURRENT_ENVIRONMENT;
                });

                return callback(proceed);
            }

            // set the proceed flag to null
            // this indicates that the current routeSchema
            // has no environment restrictions
            let proceed = null;

            forEach(options.environmentRoutes, (nodeEnv, environments) => {
                forEach(environments, (index, filePath) => {
                    const resolvedFilePath = path.resolve(filePath as string);

                    if (routeSchema.absolutePath.startsWith(resolvedFilePath)) {
                        if (proceed === false || proceed === null) {
                            proceed = nodeEnv === CURRENT_ENVIRONMENT;
                        }
                    }
                });
            });

            if (proceed === null) {
                callback(true);
            } else {
                callback(proceed);
            }
        }

        for (const route of routes) {
            const routeOptions = route.routeOptions;

            if (routeOptions.skip) {
                route.status = "skipped";
                route.message = "Route was skipped by the routeOptions.skip property";

                continue;
            }

            environmentBasedRegistration(route, (proceed) => {
                if (proceed) {
                    if (isFunction(routeOptions.notImplemented)) {
                        use.call(app, route.base_path, routeOptions.notImplemented);
                    } else {
                        use.call(app, route.base_path, handler);
                    }

                    route.status = "registered";
                    route.message = `Registered for environment: ${CURRENT_ENVIRONMENT}`;
                } else {
                    route.status = "skipped";
                    route.message = `Route is not enabled for the current environment: ${CURRENT_ENVIRONMENT}`;
                }
            });
        }

        appendToRegistry(routes);
    }

    function createRouteUrl(relativePath: string, urlModifier: (url: string) => string): string {
        let routePath = removeFileExtension(relativePath);

        // need to fix indexNames, if routeOptions.indexNames is set, use that
        // otherwise use the default indexNames

        // if indexNames is false, then don't do anything
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
    ): RouteRegistry {
        const baseSchema: RouteSchema = {
            method: null,
            absolutePath: fileEntry.path,
            routeOptions: {},
            status: null,
            base_path: null,
            extended_path: null,
            full_path: null
        };

        if (handler === null || isEmpty(handler.stack)) {
            return [modifier(baseSchema, {})];
        }

        const schemas: RouteRegistry = [];

        for (const layer of handler.stack) {
            const route = layer.route;
            const extendedPath = route.path;
            const method = route.stack[0].method;

            const mergedSchema: RouteSchema = {
                ...baseSchema,
                method: method,
                routeOptions: handler.routeOptions
            };

            const routeUrl = createRouteUrl(fileEntry.path, (url) => {
                if (handler.routeOptions.isIndex) {
                    const base = ensureLeadingToken(path.basename(url), "/").replace(/\/$/, "");

                    if (base !== options.appMount) {
                        url = url.replace(base, "");
                    }
                }

                mergedSchema.base_path = url;

                if (extendedPath && extendedPath !== "/") {
                    url = url + extendedPath;
                    mergedSchema.extended_path = extendedPath;
                }

                const paramsTokenReplacer = formulateTokenRegex(options.paramsToken);
                url = url.replace(paramsTokenReplacer, EXPRESS_PARAMS_TOKEN);

                return ensureLeadingToken(url, "/");
            });

            mergedSchema.full_path = routeUrl;

            schemas.push(modifier(mergedSchema, handler.routeOptions));
        }

        return schemas;
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

            const routeHandler = transformHandler(requireHandler, fileEntry.path);

            const routeSchema = createRouteSchema(routeHandler, fileEntry, (schema) => {
                if (routeHandler === null) {
                    schema.status = "error";
                    schema.error = "Likely you forgot to export a function.";
                }

                return schema;
            });

            if (routeHandler) {
                addRoutes(routeSchema, routeHandler);
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
