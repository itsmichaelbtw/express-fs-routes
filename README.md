# express-fs-routes

An intuitive way of defining and registering your routes for your Express app. Avoid the clutter and cumbersome process of importing your routes and manually registering them. Easily create and manage Express routes with a simple directory structure. No more hard coding routes into your projects main file. Specify a directory to scan, and all routes will be automatically registered.

**New to Express?** Check out the [Express documentation](https://expressjs.com/en/guide/routing.html) to get started.

## Table of Contents

-   [Features](#features)
-   [Installation](#installation)
-   [Quick Start](#quick-start)
-   [Examples](#examples)
    -   [Basic](#basic)
    -   [Custom Directory](#custom-directory)
    -   [Environment Specific Routes](#environment-specific-routes)
    -   [Global Route Prefix](#global-route-prefix)
    -   [Parameters](#parameters)
    -   [Extended URL Paths](#extended-url-paths)
    -   [Multiple HTTP Methods](#multiple-http-methods)
-   [Engine](#route-engine)
    -   [Engine Options](#engine-options)
    -   [Routing](#routing)
-   [Route Options](#route-options)
-   [Caveats](#caveats)
-   [FAQ](#faq)
-   [TypeScript](#typescript)
-   [Resources](#resources)

## Features

-   Supports CommonJS, ESM, and TypeScript projects
-   Existing projects can be easily migrated
-   Prefix routes with a global app mount
-   Build routes from a directory structure
-   Environment specific routes
-   Granular control over route registration behavior

## Installation

```bash
$ npm install express-fs-routes
```

```bash
$ yarn add express-fs-routes
```

> Ensure you have express installed in your project.

It is recommended to view the [examples](#examples) before continuing.

## Quick Start

Existing projects should have little to no effort when migrating to this package. This aims to eliminate as much overheard as possible when creating and managing routes. Middleware can be used as well, and will be registered in the order they are defined in the route file.

It is important to note that the relative path is the url path of a route. This is similiar to how [Next.js](https://nextjs.org/docs/routing/introduction) handles routing.

There is no limitation on the amount of times you decide to register routes. You can register routes from multiple directories, and even multiple times from the same directory. Using the same instance of the `RouteEngine` class, you can register routes from multiple directories. This is useful if you have a directory for your public routes, and another for your private routes. You can register both directories and have them both be accessible from the same Express app.

Example directory structure:

```bash
├── routes
│   ├── users
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── fetch.ts
│   │   ├── create.ts
│   │   └── delete.ts
│   └── index.ts
└── server.ts
```

Then turns into:

```bash
GET /users/login
POST /users/register
GET /users/fetch
POST /users/create
DELETE /users/delete
GET /
```

Example: `server.ts`

The initial directory you choose to scan will NOT be included in the route path. For example, if you choose to scan the `routes` directory, the route path will be `/users` and not `/routes/users`. If you wish to provide a one-time prefix for all routes, see the [Engine Options](#engine-options) section.

```typescript
import express from "express";

import { RouteEngine } from "express-fs-routes";

const app = express();
const routeEngine = new RouteEngine(app, "module"); // or "commonjs"

routeEngine.setOptions({
  directory: "routes" // or path.join(__dirname, "routes")
});

// middleware still works as normal

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.disable("x-powered-by");

// here you would normally do
// app.use("/users", usersRouter);
// app.use("/posts", postsRouter);
// app.use("/comments", commentsRouter);
// ...

// but now you can do
const registry = await routeEngine.run();

// provide a catch all route
app.use((req, res) => {
  res.status(404).send("Not Found");
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

Example: `routes/users/fetch.ts`

Whether you are using CommonJS, ES6, or TypeScript, all are supported and will be registered as expected. It is important when you define the route, that it is exported as default. This is the expected behaviour designed by Express. See more information about Express routers [here](https://expressjs.com/en/guide/routing.html#express-router).

An extra feature that is built into this package is the option to export a custom named object that will be used to control the registration behaviour of the route. See the [Route Options](#route-options) section for more information.

It is important to remember that the folder/file structure that you defined will be the base url of the route that is defined within the file at hand. You may be confused to why each file has a path of `/` and that is because the file"s relative path is used as the url. You are still free to define additional url paths within the route file. These are referred to as **extended url paths** and are explained in more detail [here](#extended-url-paths).

```typescript
import express from "express";

import type { RouterOptions } from "express-fs-routes";

const router = express.Router();

router.get("/", async (req, res) => {
  const users = await User.find();

  res.json(users);
});

export default router;
export const routeOptions: RouterOptions = {
  // options here
};
```

## Examples

### Basic

```typescript
import express from "express";

import { RouteEngine } from "express-fs-routes";

const app = express();
const routeEngine = new RouteEngine(app, "module");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await routeEngine.run(app);

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

By default, the directory that is scanned is `routes`. This is the same directory structure that is used in the [quick start](#quick-start) example.

If you are confused on the `module` reference as the 2nd argument to the constructor, have a look at the [Route Engine](#route-engine) section.

### Custom Directory

```typescript
import express from "express";

import { RouteEngine } from "express-fs-routes";

const app = express();
const routeEngine = new RouteEngine(app, "module");

routeEngine.setOptions({
  directory: "my_custom_path" // or path.join(__dirname, "my_custom_path")
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await routeEngine.run(app);

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

If you are having trouble supplying a custom directory, ensure you are using the absolute path. You can use the `path` module to help with this. See the [Engine Options](#engine-options) section for more information or the [examples](examples).

When calling `setOptions`, this can be called at any time before `run` is called. This means you can change the directory at any time.

### Environment Specific Routes

```typescript
// routes/users/fetch.ts

import express from "express";

import type { RouterOptions } from "express-fs-routes";

const router = express.Router();

router.get("/", async (req, res) => {
  const users = await User.find();

  res.json(users);
});

export default router;

export const routeOptions: RouterOptions = {
  environments: ["development", "staging"]
};
```

Environments are not standardised, so you can use whatever you want. The default environment is `development`. You can change this by setting the `NODE_ENV` environment variable. As long as the environment matches, the route will be registered. If you want to register a route for all environments, either omit this value or supply a wildcard `*`.

In this case, the above route will only be registered in the `development` and `staging` environments. Any other environment will not register the route.

See the [examples](examples) for more information.

### Global Route Prefix

Also known as an application mount, you can specify a prefix that will be appended to all registered routes. If your server sits behind `/api`, you can specify this as the global route prefix.

This saves the hassle of having to create a directory just for the prefix.

```typescript
import express from "express";

import { RouteEngine } from "express-fs-routes";

const app = express();
const routeEngine = new RouteEngine(app, "module");

routeEngine.setOptions({
  appMount: "/api"
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

// GET /api/users
// GET /api/posts
// GET /api/comments
```

### Parameters

Dynamic parameters are supported and will be parsed to treat them as such. The **slug** pattern is used to denote a parameter.

```typescript
// routes/users/[user_id]

import express from "express";

import type { RouterOptions } from "express-fs-routes";

const router = express.Router({ mergeParams: true });

router.delete("/", (req, res) => {
  const { user_id } = req.params;

  await User.delete(user_id);

  res.json({ message: `User ${user_id} deleted` });
});

export default router;

// DELETE /users/:user_id
```

Ensure you set `{ mergeParams: true }` when using parameters. This is required by express to ensure the parameters are parsed correctly. By default, a parameter will be parsed into `:param` format.

Additionally, you can provide a regex pattern that will be used to replace the slug. This is useful if you want to use a different pattern for your parameters.

```typescript
export const routeOptions: RouterOptions = {
  paramsRegex: {
    user_id: /user_id_[a-zA-Z0-9]+/ // will match user_id_1234
  }
};

// DELETE /users/:user_id(user_id_[a-zA-Z0-9]+)
```

Parameters can be nested as deep as you need. Just ensure that if you wish to use custom patterns, you provide a
pattern for each level. This is not required by default as any missing patterns will be parsed into the default `:param` format.

See the [examples](examples) for more information.

### Extended URL Paths

You may think that you are limited to utilizing the directory structure to define your routes, but you are not. You can define additional url paths within the route file. This will be appended at runtime to the base url path and will work as expected.

```typescript
// routes/users/create.ts

import express from "express";

import type { RouterOptions } from "express-fs-routes";

const router = express.Router();

router.post("/admin", async (req, res) => {
  const user = await User.create(req.body);

  res.json(user);
});

export default router;

// POST /users/create/admin
```

### Multiple HTTP Methods

When defining a route, you can specify multiple HTTP methods on the same router. All routes are handled as expected and will be registered as expected.

There is one condition to this, read the [Caveats](#caveats) section for more information.

```typescript
// routes/users

import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  const users = await User.find();

  res.json(users);
});

router.post("/", async (req, res) => {
  const user = await User.create(req.body);

  res.json(user);
});

router.delete("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  await User.delete(user_id);

  res.json({ message: `User ${user_id} deleted` });
});

// extended url paths also work
router.put("/:user_id/avatar", async (req, res) => {
  const { user_id } = req.params;

  await User.updateAvatar(user_id, req.body);

  res.json({ message: `User ${user_id} avatar updated` });
});

export default router;
```

## Route Engine

The `RouteEngine` class is the main class that is used to register routes. Start by instantiating the class with the express application and context type. The **context** is used to indicate how the internal engine should require the route files. This can be either `commonjs` or `module`. Each context type also performs its own validation on the route files.

Normally, you will most likely only need one instance of the `RouteEngine` class. However, if you wish to have multiple instances, you can do so. This is useful if you wish to have different contexts for different directories. Such as when using TypeScript, one directory may be compiled to `commonjs` and another to `module`.

When a class is instantiated, it is best to then call `setOptions` to set the options for the engine. This is required before calling `run`. All options are optional except for the `directory` option. When setting the options, it will override any previously set options.

```typescript
import express from "express";

import { RouteEngine } from "express-fs-routes";

const app = express();
const routeEngine = new RouteEngine(app, "module"); // or "commonjs"

routeEngine.setOptions({
  directory: "routes",
  appMount: "/api"
});

// or

routeEngine.setOptions(
  Object.assign({}, routeEngine.options, {
    directory: "routes",
    appMount: "/api"
  })
); // this will merge the options instead of overriding them

const registry = await routeEngine.run();
```

After calling `run`, the engine will return a `RouteRegistry` object. This object contains all the registered routes and their corresponding metadata. This is useful if you wish to perform any additional actions on the routes.

### Engine Options

<details>
<summary>See options interface</summary>

```typescript
export interface RegistrationOptions<T extends MetaData = any> {
  /**
   * The root directory that contains all routes you wish to register.
   * You may pass a relative path, or an absolute path. If you pass a relative path,
   * it will be resolved relative to `process.cwd()`.
   *
   * @default "routes"
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
   * @default ""
   */
  appMount?: string | null;

  /**
   * Specify default route metadata that will be passed to all
   * routes. Existing route metadata will be merged with this value.
   *
   * @default {}
   */
  routeMetadata?: T;

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
   *
   * @default undefined
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
   * @default ["index.js"]
   */
  indexNames?: string[];

  /**
   * Specify a directory to save a JSON file that contains a tree of all
   * registered routes, and a registry of all route handlers. This is useful
   * for debugging purposes.
   *
   * Set this to `false` to disable this feature.
   *
   * @default ".fs-routes"
   */
  output?: string | false | null;

  /**
   * Specifies whether the route registration process should run in strict mode.
   * When strict mode is enabled, additional checks and validations can be performed
   * to ensure that the routes being registered meet certain criteria or follow specific
   * guidelines.
   *
   * - The directory must exist.
   * - The required route must return a function.
   *
   * When strict mode is enabled, any errors that occur will be thrown and the registration
   * process will be aborted.
   *
   * @default false
   */
  strictMode?: boolean;

  /**
   * Whether errors should be thrown. If this is set to `false`, operations will
   * continue as normal.
   *
   * @default false
   *
   * @deprecated Use `strictMode` instead.
   */
  silent?: boolean;

  /**
   * Choose if you wish to redact the file output paths for security reasons.
   *
   * @default false
   */
  redactOutputFilePaths?: boolean;
  /**
   * A function that is called before a route undergoes registration. This
   * is called before environment based checks are performed, and before the route
   * is conditionally checked for registration. Any changes made to the route
   * object will be reflected in the registration process and the file output.
   *
   * **This is not middleware**. This will only be called once per route and won't
   * be called for each request.
   *
   * @param route The route schema object.
   * @returns The route schema object.
   *
   * @default (route) => route
   */
  beforeRegistration?(route: RouteSchema<T>): RouteSchema<T>;

  /**
   * Intercept the layer stack that is registered to the Express app and provided
   * your own custom handler for a given path. You can either return a
   * new handler, or the original handler.
   *
   * Note: The `layer` that is passed is a clone of the original layer, and will not
   * affect the original layer stack.
   *
   * @param layer The layer that is registered to the Express app.
   * @param handle The handle that is registered to the Express app.
   * @param currentIdx The current index of the layer stack.
   * @param stackSize The total size of the layer stack.
   *
   * @returns The middleware that will be registered to the Express app.
   *
   * @default null
   */
  interceptLayerStack?(
    layer: RouteLayer,
    handle: ExpressMiddleware,
    currentIdx: number,
    stackSize: number
  ): ExpressMiddleware;

  /**
   * Manage the middleware that is responsible for calling the route handler. By
   * providing this value, you are required to call the route handler yourself
   * and assign the route metadata to the request object.
   *
   * Note: The `route` object is a clone of the original route object, and will not
   * affect the original route object.
   *
   * @param route The route schema object.
   * @param handler The route handler that is registered to the Express app.
   * @returns An Express middleware function.
   *
   * @example
   * ```typescript
   * const routeEngine = new RouteEngine(app, "module");
   *
   * routeEngine.setOptions({
   *  customMiddleware: (route, handler) => {
   *   return (req, res, next) => {
   *    req.routeMetadata = route.route_options.metadata ?? {};
   *
   *    return handler.call(app, req, res, next);
   *   }
   *  }
   * })
   * ```
   *
   * @default null
   */
  customMiddleware?(route: RouteSchema<T>, handler: RouteHandler): ExpressMiddleware;
}
```
</details>

### Routing

Routing works similiar to how [Next.js](https://nextjs.org/docs/routing/introduction) handles routing. Each file in the `directory` is treated as a route. The file name is used as the route path. For example, if you have a file called `users.ts` in the `directory`, it will be registered as `/users`.

Dynamic routes are also supported and this is denoted using square brackets. For example, if you have a file called `[id].ts` in the `directory`, it will be registered as `/:id` and the `id` parameter will be available in the `req.params` object.

Only TypeScript and JavaScript files are supported. Everything else will be ignored.

## Router Options

Each file can have a `routeOptions` export. This is an optional export that allows you to specify additional options for the route. As of version **2.0.0**, all options are purely for registration purposes. There are plans to include support for dynamic route options in the future.

```typescript
// routes/users/login.ts

import express from "express";

import type { RouterOptions } from "express-fs-routes";

const router = express.Router();

router.post("/", async (req, res) => {
    const { email, password } = req.body;

    const newUser = await User.create({ email, password });

    res.json(newUser);
});

export default router;
export const routeOptions: RouterOptions = {
    environments: ["production"] // only available in these environments
};
```

The `RouterOptions` interface accepts a generic type which is used to specify the `metadata` property. See below for more information.

<details>
<summary>See RouterOptions interface</summary>

```typescript
export interface RouterOptions<T extends MetaData = MetaData> {
  /**
   * Specify certain environments you want this route to be registered in. If
   * you wish to register a route in all environments, you can omit this property
   * or provide a wild card token `*`.
   *
   * This value takes precedence over `environmentRoutes` when both are present.
   *
   * @default null
   */
  environments?: string | string[];

  /**
   * Whether this route should be treated as an index route. This route
   * will be instead mounted at the parent directory.
   *
   * This value takes precedence over `indexNames`.
   *
   * @default null
   */
  isIndex?: boolean;

  /**
   * Control whether the route should be registered. The route will still be scanned and under go
   * all the same checks, but will bypass express registration.
   *
   * @default false
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
   *
   * @default {}
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
   * @default {}
   */
  metadata?: T;
}
```

</details>

#### `environments`

Controls which environments this route should be registered in. This is not standardised, so you can specify any environment you want. As long as `NODE_ENV` is set to one of the values, the route will be registered.

This value coincides with the `environmentRoutes` option. If this option is set, it will take precedence over `environmentRoutes`.

Rules this property follows:

-   When omitted, registration is controlled depending on the `environmentRoutes` option.
-   Providing any environment will **win** over `environmentRoutes`.
-   Setting this to `*` will register the route in all environments, regardless of `environmentRoutes`.

Default: `undefined`

#### `isIndex`

Whether this route should be treated as an index route. This route will be instead mounted at the parent directory, or will "navigate up" a directory.

This value takes precedence over `indexNames`.

Default: `false`

#### `skip`

Whether to skip this route entirely.

Default: `false`

#### `paramsRegex`

Specify a custom regex pattern to use when a known parameter is found. This is useful if you want to use a different regex pattern for a specific parameter.

```typescript
// routes/users/[id].ts

export const routeOptions: RouterOptions = {
    paramsRegex: {
        id: /user_[a-z]+/
    }
};
```

#### `metadata`

Metadata can be defined per route file that will be passed onto the request object. This value will be available on the `req.routeMetadata` property.

Default: `{}`

```typescript
// routes/account/register.ts

interface RegisterMetadata {
    title: string;
    description: string;
}

app.get("/", (req, res) => {
    res.send(req.routeMetadata.title); // Register
});

export const routeOptions: RouterOptions<RegisterMetadata> = {
    metadata: {
        title: "Register",
        description: "Register a new account"
    }
};
```

See the [examples](examples) for more information.

## Caveats

Currently, when exporting the `routeOptions` object, if your file contains multiple http methods, all routes will be affected by the options. This is a limitation of the current implementation and will be addressed in a future release.

```typescript
import express from "express";

import type { RouterOptions } from "express-fs-routes";

const router = express.Router();

router.get("/foo", (req, res) => {
    res.json({ message: "foo" });
});

router.get("/bar", (req, res) => {
    res.json({ message: "bar" });
});

export default router;

export const routeOptions: RouterOptions = {
    environments: ["production"],
    skip: true
};

// all routes, both GET /foo and GET /bar will be affected by the options
```

## FAQ

Coming soon...

## TypeScript

This package is written in TypeScript and provides type definitions for the exported functions.

## Resources

-   [Express](https://expressjs.com/)
-   [Change Log](CHANGELOG.md)
-   [License](LICENSE)
