type AsyncFunction<T> = (req: Request, res: Response, next: NextFunction) => Promise<T>;
/**
 * A Higher Order Function that wraps around an Express middleware function
 * that is asynchronous. By nature, Express does not automatically catch
 * errors thrown in asynchronous middleware functions. This function wraps
 * around the middleware and catches any errors thrown then passes it to
 * the next function in the middleware chain. Primarily used for error handling.
 *
 * You are free to either wrap the middleware within this function
 * or use a try/catch block within the middleware function. Rembering
 * to call next(error) if an error is caught.
 *
 * @param middleware The Express middleware function to wrap around.
 *
 * @returns A function that wraps around the middleware function.
 *
 * @example
 * ```typescript
 * import { catchError } from "./utils";
 *
 * app.get('/async-error', catchError(async (req, res) => {
 *  throw new Error('Async Error')
 * }))
 *
 * ```
 */
export declare function catchError<T = void>(middleware: AsyncFunction<T>): (req: Request, res: Response, next: NextFunction) => Promise<void>;
import express from "express";
import type { DirectoryTree, FilePath, RouteHandler, RouterOptions, RouteSchema, RouteRegistry, RouteRegistrationOptions, ParamsRegex } from "./types";
import type { Request, Response, NextFunction } from "express";
type ExpressApp = express.Application;
type RouteRegistrationContext = "commonjs" | "module";
type RouteModifier<T, U> = (path: T, routeOptions: RouterOptions) => U;
declare class Engine {
    private readonly $app;
    private readonly $context;
    protected $routeRegistry: RouteRegistry;
    protected $options: RouteRegistrationOptions;
    protected $resolveDirectory: string;
    constructor(app: ExpressApp, context: RouteRegistrationContext);
    /**
     * The default output directory for the route registration.
     */
    static OUTPUT_DIRECTORY: string;
    /**
     * Returns the options for the route registration.
     */
    get options(): RouteRegistrationOptions;
    /**
     * Returns the route registry.
     */
    get registry(): RouteRegistry;
    /**
     * Returns the absolute directory that is being used.
     */
    get absoluteDirectory(): string;
    /**
     * Sets the options for the route registration.
     *
     * @param options The options to set.
     */
    setOptions(options: RouteRegistrationOptions): void;
    /**
     * Resolves the given file path to an absolute path
     * relative to the directory that is being used.
     *
     * @param filePath The file path to resolve.
     * @returns The resolved file path.
     */
    resolveFilePath(filePath: FilePath): FilePath;
    /**
     * An asynchronous function that is called for every file that the
     * directory scan finds. This is responsible for requiring the file
     * and transforming it into a route handler.
     *
     * @param fileEntry The file entry.
     * @returns A promise that resolves to void.
     */
    protected onFile(fileEntry: DirectoryTree): Promise<void>;
    /**
     * Attempts to load the route handler from the given path and uses
     * the given context to determine how to load the file. If the file
     * exports the `routeOptions` property, this will be parsed and
     * attached to the route handler.
     *
     * @param path The path to the route handler.
     * @returns The route handler or null if the file is empty.
     */
    protected requireHandler(path: FilePath): Promise<RouteHandler | null>;
    /**
     * Converts the given route handler into a route schema and appends
     * it to the route registry. All associated layers within
     * the routes stack are also processed and appended to the registry.
     *
     * @param handler The route handler that was required.
     * @param fileEntry The file entry from the directory scan.
     * @param modifier A function that modifies the route schema.
     * @returns An array of route schemas.
     */
    protected createRouteSchema(handler: RouteHandler | null, fileEntry: DirectoryTree, modifier?: RouteModifier<RouteSchema, RouteSchema>): RouteRegistry;
    /**
     * Creates a route URL that is used to register
     * the route to the Express application.
     *
     * @param absolutePath The absolute path to the route handler.
     * @param routeOptions Any route options that were defined.
     * @param modifier A function that modifies the route URL.
     * @returns The route URL.
     */
    protected createRouteURL(absolutePath: string, routeOptions: RouterOptions, modifier: RouteModifier<string, string>): string;
    /**
     * Attempts to replace any slug parameters with
     * the provided regex pattern. Otherwise, the
     * default Express parameter token is used.
     *
     * @param url The URL to replace the slugs in.
     * @param paramsRegex The regex pattern to use.
     * @returns The modified URL.
     */
    protected paramsRegexReplacement(url: string, paramsRegex: ParamsRegex): string;
    /**
     * Performs environment based checking on the route schema
     * and determines if the route should be registered in the
     * current environment.
     *
     * @param routeSchema The route schema to check.
     * @param callback The callback to invoke.
     */
    protected environmentBaseRegistration(routeSchema: RouteSchema, callback: (proceed: boolean) => void): void;
    /**
     * Uses the given route handler middleware. Undergoes
     * a registration hook to allow for any modifications to the
     * route schema and handler.
     *
     * @param route The route schema.
     * @param handler The route handler.
     */
    protected useRouteHandlerMiddleware(route: RouteSchema, handler: RouteHandler): void;
    /**
     * Binds the available routes to the Express application
     * and performs environment based checking.
     *
     * @param routes The routes to bind.
     * @param handler The route handler to bind.
     */
    protected bindRoutes(routes: RouteRegistry, handler: RouteHandler): void;
    /**
     * Appends the given routes to the internal route registry.
     *
     * @param routes The routes to append.
     */
    protected appendToRegistry(routes: RouteRegistry): void;
}
/**
 * Initializes a new instance of the RouteEngine class
 * that is used to register all available routes within
 * a given directory.
 *
 * @param app The express application instance.
 * @param context The context in which the routes are being registered.
 *
 * @example
 * ```typescript
 * import express from "express";
 *
 * import { RouteEngine } from "express-fs-routes";
 *
 * const app = express();
 * const fsRoutes = new RouteEngine(app, "module");
 *
 * fsRoutes.setOptions({ ... })
 *
 * await fsRoutes.registerRoutes();
 * ```
 */
export declare class RouteEngine extends Engine {
    constructor(app: ExpressApp, context: RouteRegistrationContext);
    /**
     * Registers all available routes within a given directory.
     */
    registerRoutes(): Promise<RouteRegistry>;
}
export {};
