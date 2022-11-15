import type { IRouter, Request, Response, NextFunction } from "express";

type Methods =
    | "checkout"
    | "copy"
    | "delete"
    | "get"
    | "head"
    | "lock"
    | "merge"
    | "mkactivity"
    | "mkcol"
    | "move"
    | "m-search"
    | "notify"
    | "options"
    | "patch"
    | "post"
    | "purge"
    | "put"
    | "report"
    | "search"
    | "subscribe"
    | "trace"
    | "unlock"
    | "unsubscribe";

type NotImplementedCallback = (req: Request, res: Response, next: NextFunction) => void;

type EnvironmentRoutes = {
    [key: string]: FilePath[];
};

export type FilePath = string;

export type TreeComponentType = "file" | "directory";
export type DirectoryCallback = Function;
export type DirectoryEnsemble = DirTree;
export type RouteRegistry = RouteSchema[];

/**
 * The directory tree is a recursive data structure that represents the directory
 * structure of a given directory. It is used to register routes.
 *
 * This is the returned structure when calling `createDirectoryTree`.
 */
export interface DirTree {
    /**
     * The absolute path to the directory or file.
     */
    path: FilePath;
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
    children?: DirTree[];
}

/**
 * A generated route schema created after the directory tree is traversed.
 * This provides a visual representation of the routes that will be registered.
 */
export interface RouteSchema {
    /**
     * The resolved method of the route.
     */
    method: Methods;
    /**
     * The absolute path of the file location.
     */
    absolutePath: FilePath;
    /**
     * The relative path of the route. This is the path that will be
     * registered to the express app.
     *
     * This includes the app mount, if one was provided.
     */
    base_path: string;
    /**
     * If the route contains an internal route.
     */
    extended_path: string;
    /**
     * The full path of the route.
     */
    full_path: string;
    /**
     * Any options that were exported from the file.
     */
    routeOptions: RouteHandlerOptions;
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
    routeOptions?: RouteHandlerOptions;
}

/**
 * User defined options that can be exported from a route file.
 * This is used to control the registration behavior of a given route.
 */
export interface RouteHandlerOptions {
    /**
     * Specify certain environments you want this route to be registered in. If
     * you wish to register a route in all environments, you can omit this property.
     *
     * This value takes precedence over `environmentRoutes` when both are present.
     *
     * Defaults to `undefined`.
     */
    environments?: string | string[];
    /**
     * Whether this route should be treated as an index route. This route
     * will be instead mounted at the parent directory.
     *
     * This value takes precedence over `indexNames`.
     */
    isIndex?: boolean;
    /**
     * Sometimes you may require the route to still be publicly accessible, but
     * don't want to perform it's default behaviour. You can provide custom logic to handle
     * the request instead.
     *
     * Example: You may want to temporarily disable a login/register route, but still want to
     * return a 200 response. The choice is yours.
     */
    notImplemented?: NotImplementedCallback;
    /**
     * Control whether the route should be registered. The route will still be scanned and under go
     * all the same checks, but will bypass express registration.
     *
     * Defaults to `true`.
     */
    skip?: boolean;
}

/**
 * The options that are passed to the `registerRoutes` function.
 */
export interface RouteRegistrationOptions {
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
     * Express parameters are supported by default. This allows you to specify
     * a folder or file that will be used as a paramater.
     *
     * For example, if you have a route at `routes/users/:id/retrieve`,
     * you can specify `id` as a parameter.
     *
     * Filepath: `routes/users/#id/retrieve.js`
     *
     * You may optionally specify a custom params token that will be used to
     * test for parameters.
     *
     * Defaults to `#`.
     */
    paramsToken?: string | RegExp;
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
}
