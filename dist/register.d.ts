import express from "express";
import type { FilePath } from "./types";
declare type ExpressApp = express.Application;
declare type EnvironmentRoutes = {
    [key: string]: FilePath[];
};
interface RouteRegistrationOptions {
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
export declare function registerRoutes(app: ExpressApp, options?: RouteRegistrationOptions): void;
export {};
