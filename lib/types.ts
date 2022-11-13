import type { IRouter } from "express";

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

export type FilePath = string;

export type TreeComponentType = "file" | "directory";
export type DirectoryCallback = Function;
export type DirectoryEnsemble = DirTree;

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
     * The url path of the route. This is the path that will be
     * registered to the express app.
     *
     * This includes the app mount, if one was provided.
     */
    url: string;
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
     * Specify certain environments you want this route to be registered in. If
     * you wish to register a route in all environments, you can omit this property, or
     * set it to `*`.
     *
     * Defaults to `*`.
     */
    environments?: string | string[];
    /**
     * Whether this route should be treated as an index route. This route
     * will be instead mounted at the parent directory.
     */
    isIndex?: boolean;
}
