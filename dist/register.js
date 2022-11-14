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
const debug_1 = require("./debug");
const DEFAULT_OPTIONS = {
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
    if (handler && handler.routeOptions && (0, utils_1.isObject)(handler.routeOptions)) {
        if (!handler.routeOptions.environments) {
            handler.routeOptions.environments = WILD_CARD_TOKEN;
        }
        return handler.routeOptions;
    }
    return { environments: WILD_CARD_TOKEN };
}
function parseHandler(handler, path) {
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
debugOrThrowError.silent = DEFAULT_OPTIONS.silent;
function mergeWithDefaults(options) {
    if (!(0, utils_1.isObject)(options)) {
        return DEFAULT_OPTIONS;
    }
    const opts = Object.assign({}, DEFAULT_OPTIONS, options);
    if (typeof opts.directory !== "string") {
        opts.directory = DEFAULT_OPTIONS.directory;
    }
    if (typeof opts.appMount !== "string" && opts.appMount !== null) {
        opts.appMount = DEFAULT_OPTIONS.appMount;
    }
    if (!(0, utils_1.isObject)(opts.environmentRoutes)) {
        opts.environmentRoutes = {};
    }
    if (!(0, utils_1.isArray)(opts.indexNames)) {
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
function registerRoutes(app, options) {
    options = mergeWithDefaults(options);
    debugOrThrowError.silent = options.silent;
    const routeRegistry = [];
    const resolvedDirectory = path_1.default.resolve(options.directory);
    const tree = (0, directory_tree_1.createDirectoryTree)(resolvedDirectory, onFile);
    function appendToRegistry(route) {
        routeRegistry.push(route);
    }
    function addRoute(route, handler) {
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
    function createRouteUrl(relativePath, urlModifier) {
        let routePath = (0, utils_1.removeFileExtension)(relativePath);
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
            url: null
        };
        if (handler === null) {
            return modifier(baseSchema, {});
        }
        const handlerStack = handler.stack[0];
        const routeOptions = handler.routeOptions;
        // i think it would be neccessary to create a route schema for each
        // stack that is attached to the handler
        const method = handlerStack.route.stack[0].method.toUpperCase();
        const routeUrl = createRouteUrl(fileEntry.path, (url) => {
            if (routeOptions.isIndex) {
                const base = (0, utils_1.ensureLeadingToken)(path_1.default.basename(url), "/").replace(/\/$/, "");
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
            // if (extendedUrl && extendedUrl !== "/") {
            //     url = url + extendedUrl;
            //     handler.stack[0].regexp = EXPRESS_BASE_REGEX;
            //     handler.stack[0].route.path = "/";
            // }
            const paramsTokenReplacer = formulateTokenRegex(options.paramsToken);
            url = url.replace(paramsTokenReplacer, EXPRESS_PARAMS_TOKEN);
            return (0, utils_1.ensureLeadingToken)(url, "/");
        });
        const schema = Object.assign({}, baseSchema, {
            method: method,
            routeOptions: routeOptions,
            url: routeUrl
        });
        return modifier(schema, routeOptions);
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
            const routeHandler = parseHandler(requireHandler, fileEntry.path);
            const routeSchema = createRouteSchema(routeHandler, fileEntry, (schema) => {
                if (routeHandler === null) {
                    schema.status = "error";
                }
                return schema;
            });
            if (routeHandler) {
                addRoute(routeSchema, routeHandler);
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
// create a visualis representation of all api routes that are registered
