"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = void 0;
const path_1 = __importDefault(require("path"));
const path_to_regexp_1 = require("path-to-regexp");
const directory_tree_1 = require("./directory-tree");
const output_1 = require("./output");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const parse_options_1 = require("./parse-options");
const debug_1 = require("./debug");
function convertPathRegex(path) {
    return (0, path_to_regexp_1.pathToRegexp)(path);
}
function formulateTokenRegex(token) {
    if (token) {
        if (token instanceof RegExp) {
            return token;
        }
        else if (typeof token === "string") {
            return new RegExp(token, "g");
        }
    }
    return new RegExp(/#/, "g");
}
function getRouteOptions(handler) {
    // each individual handler exports a property called `routeOptions`
    // which controls the route's behavior when it is registered.
    // create a default route options and merge it with the handler's
    // route options.
    if (handler && handler.routeOptions && (0, utils_1.isObject)(handler.routeOptions)) {
        return (0, parse_options_1.parseRouterHandlerOptions)(handler.routeOptions);
    }
    return constants_1.DEFAULT_ROUTE_OPTIONS;
}
function transformHandler(handler, path) {
    const errorMessage = `The default export of a route must be a function. Found at: ${path}`;
    function handleNonFunction() {
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
function debugOrThrowError(message, color) {
    if (debugOrThrowError.silent) {
        return (0, debug_1.debug)(message, color);
    }
    else {
        throw new Error(message);
    }
}
debugOrThrowError.silent = constants_1.DEFAULT_OPTIONS.silent;
function registerRoutes(app, options) {
    options = (0, parse_options_1.parseRouteRegistrationOptions)(options);
    debugOrThrowError.silent = options.silent;
    const routeRegistry = [];
    const use = app.use;
    const CURRENT_ENVIRONMENT = (0, utils_1.getCurrentWorkingEnvironment)();
    const resolvedDirectory = path_1.default.resolve(options.directory);
    const tree = (0, directory_tree_1.createDirectoryTree)(resolvedDirectory, onFile);
    function appendToRegistry(routes) {
        for (const routeSchema of routes) {
            // @ts-expect-error
            routeSchema.routeOptions.notImplemented = !!routeSchema.routeOptions.notImplemented;
            routeRegistry.push(routeSchema);
        }
    }
    function addRoutes(routes, handler) {
        function environmentBasedRegistration(routeSchema, callback) {
            const routeOptions = routeSchema.routeOptions;
            if ((0, utils_1.isUndefined)(routeOptions.environments) && (0, utils_1.isEmpty)(options.environmentRoutes)) {
                return callback(true);
            }
            if ((0, utils_1.isArray)(routeOptions.environments)) {
                const proceed = routeOptions.environments.some((environment) => {
                    return environment === constants_1.WILD_CARD_TOKEN || environment === CURRENT_ENVIRONMENT;
                });
                return callback(proceed);
            }
            // set the proceed flag to null
            // this indicates that the current routeSchema
            // has no environment restrictions
            let proceed = null;
            (0, utils_1.forEach)(options.environmentRoutes, (nodeEnv, environments) => {
                (0, utils_1.forEach)(environments, (index, filePath) => {
                    const resolvedFilePath = path_1.default.resolve(filePath);
                    if (routeSchema.absolutePath.startsWith(resolvedFilePath)) {
                        if (proceed === false || proceed === null) {
                            proceed = nodeEnv === CURRENT_ENVIRONMENT;
                        }
                    }
                });
            });
            if (proceed === null) {
                callback(true);
            }
            else {
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
                    if ((0, utils_1.isFunction)(routeOptions.notImplemented)) {
                        use.call(app, route.base_path, routeOptions.notImplemented);
                    }
                    else {
                        use.call(app, route.base_path, handler);
                    }
                    route.status = "registered";
                    route.message = `Registered for environment: ${CURRENT_ENVIRONMENT}`;
                }
                else {
                    route.status = "skipped";
                    route.message = `Route is not enabled for the current environment: ${CURRENT_ENVIRONMENT}`;
                }
            });
        }
        appendToRegistry(routes);
    }
    function createRouteUrl(relativePath, urlModifier) {
        let routePath = (0, utils_1.removeFileExtension)(relativePath);
        // need to fix indexNames, if routeOptions.indexNames is set, use that
        // otherwise use the default indexNames
        // if indexNames is false, then don't do anything
        for (const indexName of options.indexNames) {
            const name = (0, utils_1.removeFileExtension)(indexName);
            if (routePath.endsWith(name)) {
                routePath = routePath.replace(name, "");
            }
        }
        if (routePath.startsWith(resolvedDirectory)) {
            routePath = routePath.replace(resolvedDirectory, "");
        }
        routePath = routePath.replace(/\\/g, "/");
        if (!!options.appMount) {
            const appMount = (0, utils_1.ensureLeadingToken)(options.appMount, "/");
            routePath = (0, utils_1.ensureLeadingToken)(routePath, appMount);
        }
        if (routePath.endsWith("/")) {
            routePath = routePath.slice(0, -1);
        }
        return urlModifier(routePath);
    }
    function createRouteSchema(handler, fileEntry, modifier) {
        const baseSchema = {
            method: null,
            absolutePath: fileEntry.path,
            routeOptions: {},
            status: null,
            base_path: null,
            extended_path: null,
            full_path: null
        };
        if (handler === null || (0, utils_1.isEmpty)(handler.stack)) {
            return [modifier(baseSchema, {})];
        }
        const schemas = [];
        for (const layer of handler.stack) {
            const route = layer.route;
            const extendedPath = route.path;
            const method = route.stack[0].method;
            const mergedSchema = Object.assign(Object.assign({}, baseSchema), { method: method, routeOptions: handler.routeOptions });
            const routeUrl = createRouteUrl(fileEntry.path, (url) => {
                if (handler.routeOptions.isIndex) {
                    const base = (0, utils_1.ensureLeadingToken)(path_1.default.basename(url), "/").replace(/\/$/, "");
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
                url = url.replace(paramsTokenReplacer, constants_1.EXPRESS_PARAMS_TOKEN);
                return (0, utils_1.ensureLeadingToken)(url, "/");
            });
            mergedSchema.full_path = routeUrl;
            schemas.push(modifier(mergedSchema, handler.routeOptions));
        }
        return schemas;
    }
    function onFile(fileEntry) {
        try {
            const requireHandler = require(fileEntry.path);
            if ((0, utils_1.isEmpty)(requireHandler)) {
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
            }
            else {
                appendToRegistry(routeSchema);
            }
        }
        catch (error) {
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
        (0, output_1.checkOutputDir)(options.output, (dir) => {
            (0, output_1.saveOutputToDisk)(dir, routeRegistry, "route_registry.json");
            (0, output_1.saveOutputToDisk)(dir, tree, "directory_tree.json");
        });
    }
}
exports.registerRoutes = registerRoutes;
