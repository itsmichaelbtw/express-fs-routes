import type { RouterOptions, RegistrationOptions } from "./types";

export const SLUG_REGEX = /\[(.*?)\]/gi;
export const EXPRESS_PARAMS_TOKEN = ":";
export const WILD_CARD_TOKEN = "*";
export const CURRENT_ENVIRONMENT = process.env.NODE_ENV || "development";
export const OUTPUT_DIRECTORY = ".fs-routes";
export const MAX_SAFE_PROMISES = 100;

export const DEFAULT_OPTIONS: RegistrationOptions = {
  directory: "routes",
  appMount: "",
  defaultRouteMetadata: {},
  environmentRoutes: undefined,
  indexNames: ["index.js"],
  output: OUTPUT_DIRECTORY,
  strictMode: false,
  redactOutputFilePaths: false,
  beforeRegistration: (route) => route,
  customMiddleware: null,
  interceptLayerStack: null
};

export const DEFAULT_ROUTE_OPTIONS: RouterOptions = {
  environments: null,
  isIndex: null,
  skip: false,
  paramsRegex: {},
  metadata: {}
};

export const TREE_NODE_FILENAME = "tree-node.json";
export const REGISTRY_FILENAME = "route-registry.json";
export const REDACT_TOKEN = "...";
