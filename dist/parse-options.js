"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRouterHandlerOptions = exports.parseRouteRegistrationOptions = void 0;
const utils_1 = require("./utils");
const constants_1 = require("./constants");
function parseRouteRegistrationOptions(options) {
    if (!(0, utils_1.isObject)(options)) {
        return constants_1.DEFAULT_OPTIONS;
    }
    const opts = Object.assign({}, constants_1.DEFAULT_OPTIONS, options);
    if (!(0, utils_1.isString)(opts.directory)) {
        opts.directory = constants_1.DEFAULT_OPTIONS.directory;
    }
    if (!(0, utils_1.isString)(opts.appMount) && opts.appMount !== null) {
        opts.appMount = constants_1.DEFAULT_OPTIONS.appMount;
    }
    if (!(0, utils_1.isObject)(opts.environmentRoutes)) {
        opts.environmentRoutes = {};
    }
    if (!(0, utils_1.isArray)(opts.indexNames)) {
        opts.indexNames = constants_1.DEFAULT_OPTIONS.indexNames;
    }
    if (!(0, utils_1.isString)(opts.output) && opts.output !== false && opts.output !== null) {
        opts.output = constants_1.DEFAULT_OPTIONS.output;
    }
    if (!(0, utils_1.isString)(opts.paramsToken) &&
        !(opts.paramsToken instanceof RegExp) &&
        opts.paramsToken !== null) {
        opts.paramsToken = constants_1.DEFAULT_OPTIONS.paramsToken;
    }
    return opts;
}
exports.parseRouteRegistrationOptions = parseRouteRegistrationOptions;
function parseRouterHandlerOptions(options) {
    if (!(0, utils_1.isObject)(options)) {
        return constants_1.DEFAULT_ROUTE_OPTIONS;
    }
    const opts = Object.assign({}, constants_1.DEFAULT_ROUTE_OPTIONS, options);
    if (!(0, utils_1.isFunction)(opts.notImplemented)) {
        opts.notImplemented = constants_1.DEFAULT_ROUTE_OPTIONS.notImplemented;
    }
    if (opts.environments !== undefined) {
        if ((0, utils_1.isString)(opts.environments)) {
            opts.environments = [opts.environments];
        }
        else if (!(0, utils_1.isArray)(opts.environments) || (0, utils_1.isEmpty)(opts.environments)) {
            opts.environments = constants_1.DEFAULT_ROUTE_OPTIONS.environments;
        }
    }
    return opts;
}
exports.parseRouterHandlerOptions = parseRouterHandlerOptions;
