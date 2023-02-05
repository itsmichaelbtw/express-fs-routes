import type { RouterOptions, RouteRegistrationOptions } from "./types";

export const SLUG_REGEX = /\[(.*?)\]/gi;
export const EXPRESS_PARAMS_TOKEN = ":";
export const WILD_CARD_TOKEN = "*";
export const CURRENT_ENVIRONMENT = process.env.NODE_ENV || "development";
export const OUTPUT_DIRECTORY = ".fs-routes";

export const DEFAULT_OPTIONS: RouteRegistrationOptions = {
    directory: "routes",
    appMount: "",
    indexNames: ["index.js"],
    output: OUTPUT_DIRECTORY,
    silent: false,
    environmentRoutes: undefined,
    redactOutputFilePaths: false
};

export const DEFAULT_ROUTE_OPTIONS: RouterOptions = {
    environments: null,
    isIndex: null,
    skip: false,
    paramsRegex: {}
};
