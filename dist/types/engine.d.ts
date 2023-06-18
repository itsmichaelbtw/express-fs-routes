import type { RouteSchema, RouterOptions, RegistrationOptions, RouteRegistry, FilePath, MetaData, TreeNode, RouteHandler, FileExtension, ParamsRegex } from "./types";
import express from "express";
type ExpressApp = express.Application;
type Context = "commonjs" | "module";
type RouteModifier = (routeSchema: RouteSchema, routeOptions: RouterOptions) => RouteSchema;
declare class Engine {
    private readonly $app;
    private readonly $context;
    protected $registry: RouteRegistry;
    protected $options: RegistrationOptions;
    protected $currentDirectory: string;
    constructor(app: ExpressApp, context: Context);
    /**
     * The default output directory for the route
     * registry and tree node files.
     */
    static OUTPUT_DIRECTORY: string;
    /**
     * Returns the options for the route registration.
     */
    get options(): RegistrationOptions;
    /**
     * Returns the route registry.
     */
    get registry(): RouteRegistry;
    /**
     * Returns the absolute directory that is being used
     * to register routes.
     */
    get absoluteDirectory(): string;
    /**
     * Sets the options for the route registration.
     *
     * @param options The options to set.
     */
    setOptions(options: RegistrationOptions): void;
    /**
     * Registers the given tree node as a route. This
     * method is called recursively for each file in
     * the directory tree. Alternatively, you can call
     * this method with a file path to register a single
     * route.
     *
     * @param node The tree node to register.
     * @returns The route schema.
     */
    registerRoute(node: TreeNode): Promise<RouteSchema>;
    /**
     * Attempts to load the route handler from the given path and uses
     * the given context to determine how to load the file. If the file
     * exports the `routeOptions` property, this will be parsed and
     * attached to the route handler.
     *
     * @param path The path to the route handler.
     * @returns The route handler or null if the file is empty.
     */
    protected requireHandler(path: FilePath, extension: FileExtension): Promise<RouteHandler>;
    /**
     * Creates a new route schema for the given handler and
     * file entry.
     *
     * @param routeHandler The router handler.
     * @param schema The file entry.
     * @param modifier The route modifier.
     * @returns The route schema.
     */
    protected createRouteSchema(routeHandler: RouteHandler, schema: TreeNode, modifier?: RouteModifier): RouteSchema;
    /**
     * Converts the given route handler into a route schema and appends
     * it to the route registry. All associated layers within
     * the routes stack are also processed and appended to the registry.
     *
     * @param routeHandler The route handler that was required.
     * @param schema The file entry from the directory scan.
     * @param modifier A function that modifies the route schema.
     * @returns An array of route schemas.
     */
    protected createRouteUrl(routeHandler: RouteHandler, schema: TreeNode): string;
    /**
     * Uses the given route schema to register the route
     * with the Express application. This uses the `beforeRegistration`
     * hook to allow for any modifications to the route schema.
     *
     * Environmented based registration is also performed to determine
     * if the route should be registered in the current environment.
     *
     * @param routeHandler The route handler.
     * @param routeSchema The route schema.
     */
    protected useRouteSchema(routeHandler: RouteHandler, routeSchema: RouteSchema): void;
    /**
     * Performs environment based checking on the route schema
     * and determines if the route should be registered in the
     * current environment.
     *
     * @param routeSchema The route schema to check.
     * @param callback The callback to invoke.
     */
    protected environmentBasedRegistration(routeSchema: RouteSchema, callback: (proceed: boolean) => void): void;
    /**
     * Attempts to replace any slug parameters with
     * the provided regex pattern. Otherwise, the
     * default Express parameter token is used.
     *
     * @param url The URL to replace the slugs in.
     * @param paramsRegex The regex pattern to use.
     * @returns The modified URL.
     */
    protected paramsReplacement(url: string, paramsRegex: ParamsRegex): string;
    /**
     * Uses the given route handler middleware. Undergoes
     * a registration hook to allow for any modifications to the
     * route schema and handler.
     *
     * @param route The route schema.
     * @param handler The route handler.
     */
    protected assignMiddleware(routeHandler: RouteHandler, routeSchema: RouteSchema): void;
    /**
     * Resolves the given file path to an absolute path
     * relative to the directory that is being used.
     *
     * @param filePath The file path to resolve.
     * @returns The resolved file path.
     */
    resolveFilePath(filePath: FilePath): FilePath;
    /**
     * Transforms the file path depending on the context
     * and current operating system.
     *
     * @param filePath The file path to transform.
     */
    transformFilePath(filePath: FilePath, extension: FileExtension): FilePath;
    /**
     * Appends the newly made route schema to the registry.
     *
     * @param routeSchema The route schema to append.
     */
    append(routeSchema: RouteSchema): void;
    /**
     * Clears the route registry.
     */
    clear(): void;
}
export declare class RouteEngine extends Engine {
    constructor(app: ExpressApp, context: Context);
    /**
     * Saves the output of the route registry and tree node
     * files to the given output directory. If the `redactOutputFilePaths`
     * option is set to true, the file paths will be redacted.
     *
     * @param tree The tree node.
     * @returns The route registry.
     */
    private save;
    /**
     * Runs the route engine, reading the directory tree
     * and registering the routes. If you have indicated
     * the output directory, the route registry and tree
     * node files will be saved.
     *
     * @returns The route registry.
     */
    run<T extends MetaData>(): Promise<RouteRegistry<T>>;
}
export {};
