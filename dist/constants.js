"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROUTE_OPTIONS = exports.DEFAULT_OPTIONS = exports.CURRENT_ENVIRONMENT = exports.WILD_CARD_TOKEN = exports.EXPRESS_BASE_REGEX = exports.EXPRESS_PARAMS_TOKEN = void 0;
exports.EXPRESS_PARAMS_TOKEN = ":";
exports.EXPRESS_BASE_REGEX = /^\/?$/i;
exports.WILD_CARD_TOKEN = "*";
exports.CURRENT_ENVIRONMENT = process.env.NODE_ENV || "development";
exports.DEFAULT_OPTIONS = {
    directory: "routes",
    appMount: "",
    indexNames: ["index.js"],
    paramsToken: "#",
    output: ".fs-routes",
    silent: false
};
exports.DEFAULT_ROUTE_OPTIONS = {
    environments: undefined,
    isIndex: null,
    skip: false,
    notImplemented: null
};
