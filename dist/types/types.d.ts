import type { IRouter, Request, Response, NextFunction } from "express";
type Methods = "checkout" | "copy" | "delete" | "get" | "head" | "lock" | "merge" | "mkactivity" | "mkcol" | "move" | "m-search" | "notify" | "options" | "patch" | "post" | "purge" | "put" | "report" | "search" | "subscribe" | "trace" | "unlock" | "unsubscribe";
interface EnvironmentRoutes {
    [key: string]: FilePath[];
}
export interface ParamsRegex {
    [key: string]: RegExp | string;
}
/**
 * An express middleware function that is used to handle a given route.
 */
export type RouteHandlerMiddleware = (req: Request, res: Response, next: NextFunction) => void;
/**
 * The file path to a given route file.
 */
export type FilePath = string;
/**
 * The component type of a given node within
 * the directory tree. Only used for internal
 * purposes. This is the value of `route_tree[type]`.
 */
export type TreeComponentType = "file" | "directory";
/**
 * The callback function that is called when
 * a directory is traversed and a file is found.
 */
export type DirectoryCallback = (fileEntry: DirectoryTree) => Promise<void>;
/**
 * The registry of routes that are registered to
 * the express app.
 */
export type RouteRegistry = RouteSchema[];
/**
 * The directory tree is a recursive data structure that represents the
 * structure of a given directory. It is used to register routes.
 */
export interface DirectoryTree {
    /**
     * The absolute path to the directory or file.
     */
    absolute_path: FilePath;
    /**
     * The name of the directory or file.
     */
    name: string;
    /**
     * The type of component that was found. This will either be `file` or `directory`.
     */
    type: TreeComponentType;
    /**
     * The children of the directory. This will only be present if the component type
     * is `directory`.
     */
    children?: DirectoryTree[];
}
/**
 * A generated route schema created after the directory is traversed.
 * This provides a visual representation of the routes that will
 * be registered.
 */
export interface RouteSchema {
    /**
     * The resolved method of the route.
     */
    method: Methods;
    /**
     * The absolute path of the file location.
     */
    absolute_path: FilePath;
    /**
     * The relative path of the route. Does not include
     * the extended path.
     */
    base_path: string;
    /**
     * If the route contains an internal route.
     */
    extended_path: string;
    /**
     * The full path of the route. This is the combination of the
     * base path and the extended path.
     *
     * This is used to register the route to the express app.
     */
    full_path: string;
    /**
     * Any options that were exported from the file.
     */
    route_options: RouterOptions;
    /**
     * The status of the route.
     */
    status: "registered" | "skipped" | "error";
    /**
     * Error message if the route was skipped.
     */
    error?: string;
    /**
     * A message that describes the status of the route.
     */
    message?: string;
}
/**
 * An object that represents a given route when requiring a route file.
 */
export interface RouteHandler extends IRouter {
    /**
     * A user defined object that is exported from the route file. This controls
     * the registration behaviour of the route.
     *
     * This is not a native express property.
     */
    routeOptions?: RouterOptions;
}
/**
 * User defined options that can be exported from a route file.
 * This is used to control the registration behavior of a given route.
 *
 * @example
 * ```ts
 * export const routeOptions: RouterOptions = {
 *  ...
 * }
 * ```
 */
export interface RouterOptions {
    /**
     * Specify certain environments you want this route to be registered in. If
     * you wish to register a route in all environments, you can omit this property
     * or provide a wild card token `*`.
     *
     * This value takes precedence over `environmentRoutes` when both are present.
     *
     * Defaults to `null`.
     */
    environments?: string | string[];
    /**
     * Whether this route should be treated as an index route. This route
     * will be instead mounted at the parent directory.
     *
     * This value takes precedence over `indexNames`.
     *
     * If you have defined a path that is
     */
    isIndex?: boolean;
    /**
     * Control whether the route should be registered. The route will still be scanned and under go
     * all the same checks, but will bypass express registration.
     *
     * Defaults to `true`.
     */
    skip?: boolean;
    /**
     * Specify a custom parameter regex that will be used when
     * registering the route to the express app.
     *
     * It supports nested parameters, and will be used to replace
     * the default regex.
     *
     * ```ts
     * export const routeOptions: RouterOptions = {
     *  paramsRegex: {
     *    post_id: /post_id_[a-z]+/,
     *    user_id: /user_id_[a-z]+/
     *  }
     * }
     * ```
     *
     * Accepts either a string or a RegExp. If a RegExp is provided,
     * it will be converted to a string using `.source`.
     */
    paramsRegex?: ParamsRegex;
    /**
     * Metadata that is passed to the route and is available
     * in the `req` object as `req.routeMetadata`.
     *
     * This is useful for passing data to middleware that is
     * specific to a given route where you want to have request
     * based context or conditional logic.
     *
     * By default, all metadata is defaulted to `{}`.
     */
    metadata?: Record<string, any>;
}
/**
 * The options that are passed to the `registerRoutes` function.
 */
export interface RouteRegistrationOptions {
    /**
     * The root directory that contains all routes you wish to register.
     * You may pass a relative path, or an absolute path. If you pass a relative path,
     * it will be resolved relative to `process.cwd()`.
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
     * Choose if you wish to redact the file output paths for security reasons.
     */
    redactOutputFilePaths?: boolean;
    /**
     * Whether errors should be thrown. If this is set to `false`, operations will
     * continue as normal.
     *
     * Defaults to `false`.
     */
    silent?: boolean;
    /**
     * A function that is called before a route undergoes registration. This
     * is called before environment based checks are performed, and before the route
     * is conditionally checked for registration. Any changes made to the route
     * object will be reflected in the registration process and the file output.
     *
     * **This is not middleware**. This will only be called once per route and won't
     * be called for each request.
     *
     * @param route
     */
    beforeRegistration?(route: RouteSchema): RouteSchema;
}
export {};
