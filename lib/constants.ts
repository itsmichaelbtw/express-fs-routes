import type { RouteHandlerOptions, RouteRegistrationOptions } from "./types";

export const EXPRESS_PARAMS_TOKEN = ":";
export const EXPRESS_BASE_REGEX = /^\/?$/i;
export const WILD_CARD_TOKEN = "*";
// export const CURRENT_ENVIRONMENT = process.env.NODE_ENV || "development";
export const CURRENT_ENVIRONMENT = "test";

export const DEFAULT_OPTIONS: RouteRegistrationOptions = {
    directory: "routes",
    appMount: "",
    indexNames: ["index.js"],
    paramsToken: "#",
    output: ".fs-routes",
    silent: false
};

export const DEFAULT_ROUTE_OPTIONS: RouteHandlerOptions = {
    environments: undefined,
    isIndex: null,
    skip: false,
    notImplemented: null
};
