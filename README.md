# express-fs-routes

An intuitive way of defining and registering your routes for your express app. Avoid the clutter and cumbersome process of importing your routes and manually registering them. Easily create and manage express routes with a simple directory structure. No more hard coding routes into your projects main file. Specify a directory to scan, and all routes will be automatically registered.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Examples](#examples)
  - [Basic](#basic)
  - [Custom Directory](#custom-directory)
  - [Environment Specific Routes](#environment-specific-routes)
  - [Global Route Prefix](#global-route-prefix)
  - [Parameters](#parameters)
  - [Router Options](#router-options)
  - [Extended Url Paths](#extended-url-paths)
- [Options](#options)
- [Route Options](#route-options)
- [Caveats](#caveats)
- [FAQ](#faq)
- [TypeScript](#typescript)
- [Resources](#resources)

## Features

- Supports CommonJS, ES6, and TypeScript projects
- Existing projects can be easily migrated
- Built-in route validation
- Global route prefix
- Build routes from a directory structure
- Built-in migration tool (coming soon)
- Environment specific routes
- Granular control over route registration behavior

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

It is important to note that the relative path is the url path of a route. This is similiar to how [Next.js](https://nextjs.org/) handles routing. 

<!-- You may find when migrating an existing project, your routes may not be registered the way you expect. Ensure you are using the built-in migration tool. -->

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

The initial directory you choose to scan will NOT be included in the route path. For example, if you choose to scan the `routes` directory, the route path will be `/users` and not `/routes/users`. If you wish to provide a one-time prefix for all routes, see the [options](#options) section.

```typescript
import express from 'express';

import { registerRoutes } from 'express-fs-routes';

const app = express();

// middleware still works as normal

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.disable('x-powered-by');

// here you would normally do
// app.use('/users', usersRouter);
// app.use('/posts', postsRouter);
// app.use('/comments', commentsRouter);
// ...

// but now you can do this
registerRoutes(app, {
  directory: 'routes', // or path.join(__dirname, 'routes')
});

// provide a catch all route
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

Example: `routes/users/fetch.ts`

Whether you are using CommonJS, ES6, or TypeScript, all are supported and will be registered as expected. It is important when you define the route, that it is exported as default. This is the expected behaviour designed by express. See more information about express routers [here](https://expressjs.com/en/guide/routing.html#express-router).

An extra feature that is built into this package is the option to export a custom named object that will be used to control the registration behaviour of the route. See the [route options](#route-options) section for more information.

It is important to remember that the folder/file structure that you defined will be the base url of the route that is defined within the file at hand. You may be confused to why each file has a path of `/` and that is because the file's relative path is used as the url. You are still free to define additional url paths within the route file. Learn more [here](#extended-url-paths).

```typescript
import express from 'express';

import type { RouteHandlerOptions } from 'express-fs-routes';

const router = express.Router();

router.get("/", async (req, res) => {
  const users = await User.find();

  res.json(users);
});

export default router;
export const routeOptions: RouteHandlerOptions = {
  // options here
};
```

## Examples

### Basic

```typescript
import express from 'express';

import { registerRoutes } from 'express-fs-routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

registerRoutes(app);

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

By default, the directory that is scanned is `routes`. This is the same directory structure that is used in the [quick start](#quick-start) example.

### Custom Directory

```typescript
import express from 'express';
import path from 'path';

import { registerRoutes } from 'express-fs-routes';

const app = express();

registerRoutes(app, {
  directory: 'routes'
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

If you are having trouble supplying a custom directory, ensure you are using the absolute path. You can use the `path` module to help with this. See the [options](#options) section for more information or the [examples](examples).

### Environment Specific Routes

```typescript
// routes/users/fetch.ts

import express from 'express';

import type { RouteHandlerOptions } from 'express-fs-routes';

const router = express.Router();

router.get("/", async (req, res) => {
  const users = await User.find();

  res.json(users);
});

export default router;

export const routeOptions: RouteHandlerOptions = {
  environments: ['development', 'staging']
};
```

Environments are not standardised, so you can use whatever you want. The default environment is `development`. You can change this by setting the `NODE_ENV` environment variable. As long as the environment matches, the route will be registered.

See the [examples](examples) for more information.

### Global Route Prefix

Also known as an application mount, you can specify a prefix that will be appended to all registered routes. If your server sits behind `/api`, you can specify this as the global route prefix.

This saves the hassle of having to create a directory just for the prefix.

```typescript
import express from 'express';

import { registerRoutes } from 'express-fs-routes';

const app = express();

registerRoutes(app, {
  appMount: '/api'
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});

// GET /api/users
// GET /api/posts
// GET /api/comments
```

### Parameters

Dynamic parameters are supported and will be parsed to treat them as such. The `#` symbol is used to denote a parameter. You are free to customize this symbol by using the `paramsToken` option. See the [options](#options) section for more information.

```typescript
// routes/users/#user_id/delete.ts

import express from 'express';

import type { RouteHandlerOptions } from 'express-fs-routes';

const router = express.Router({ mergeParams: true });

router.delete("/", (req, res) => {
  const { user_id } = req.params;

  await User.delete(user_id);

  res.json({ message: `User ${user_id} deleted` });
})

export default router;
```
Ensure you set `{ mergeParams: true }` when using parameters. This is required by express to ensure the parameters are parsed correctly. 

See the [examples](examples) for more information.

### Router Options

```typescript
// routes/users/login.ts

import express from 'express';

import type { RouteHandlerOptions } from 'express-fs-routes';

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body;

  const newUser = await User.create({ email, password });

  res.json(newUser);
});

export default router;

export const routeOptions: RouteHandlerOptions = {
  environments: ['production'], // only available in these environments
  notImplemented: (req, res) => {
    res.status(503).json({ message: 'Login is currently unavailable' });
  } 
};
```

Important: When the `notImplemented` property is present, this will be used to register the route instead of the default route handler. This is NOT evaluated on each request, ONLY when the routes are first initially registered. If you wish to resume default behaviour, simply remove the `notImplemented` property and restart the server.

See [Route Options](#route-options) for more information.

### Extended Url Paths

You may think that you are limited to utilizing the directory structure to define your routes, but you are not. You can define additional url paths within the route file. This will be appended at runtime to the base url path and will work as expected.

```typescript
// routes/users/create.ts

import express from 'express';

import type { RouteHandlerOptions } from 'express-fs-routes';

const router = express.Router();

router.post("/admin", async (req, res) => {
  const user = await User.create(req.body);

  res.json(user);
});

export default router;

// POST /users/create/admin
```

## Options

### `directory`

The directory to scan for route files. This is relative to the current working directory. The default value is `routes`.

```typescript
registerRoutes(app, {
  directory: 'routes' // or path.resolve(__dirname, 'routes')
});
```

Default: `routes`

### `appMount`

An optional prefix to append to all registered routes. This is useful if your server sits behind a prefix, such as `/api` for example.

```typescript
registerRoutes(app, {
  appMount: '/api'
});
```

### `environmentRoutes`

Specify and control any routes that are specific to a certain environment. This is resolved relative to the `directory` option. If you instead wish to use the root directory as the environment, you must instead pass an absolute path. E.g. `path.join(__dirname, "routes")`.

See the [examples](examples) for more information.

```typescript
registerRoutes(app, {
  environmentRoutes: {
    development: ['dev'], // only the dev directory will be registered in development
    production: ['users', 'posts'] // only the users and posts directories will be registered in production
  }
});
```

By default all routes are registered in all environments. If you prefer to have granular control over this behaviour, check out [Route Options](#route-options).

> Note: Only accepts directories, not files.

### `indexNames`

Sometimes you may want to specify routes that act upon the root of a directory, or the index of a directory.

For example, if you have a directory structure like this:

```
routes/
  users/
    index.js
    retrieve.js
```

You can specify that the `index.js` file should be used to handle the root of the `users` directory. Now you will have an accessible route at `/users` and `/users/retrieve`. Any file names will work, it doesn't have to be `index.js`.

Default: `['index.js']`.

> Note: Only accepts files, not directories.

### `paramsToken`

Express paramaters are supported by default. This allows you to specify a folder or file that will consume a dynamic parameter. You can specify a custom token to use.

Example:

```
routes/
  users/
    #user_id/
      retrieve.js
```

Is then parsed into `/users/:user_id/retrieve` and will be accessible on `req.params.user_id`.

Default: `#`
### `output`

Specify a directory that you wish to save a JSON output of the directory tree and route registry to. This is used to visualise and introspect the routes that have been registered.

Default: `.fs-routes`

### `redactOutputFilePaths`

Redact the file paths in the output JSON file. This is useful if you wish to share the output file with others, but do not want to expose the file paths on your machine. You will instead see `...`

Default: `false`

### `silent`

Whether to suppress any errors that may occur. If set to `true`, errors will be logged to the console. If set to `false`, errors will be thrown.

Default: `false`

## Route Options

A built-in feature this package provides is the ability to export a custom named object that will be used to control the registration behaviour of the route. This behaviour is only evaluated when registering the route. The object is not used by express in any way.

```typescript
type NotImplementedCallback = (req: Request, res: Response, next: NextFunction) => void;

export interface RouteHandlerOptions {
    environments?: string | string[];
    isIndex?: boolean;
    notImplemented?: NotImplementedCallback;
    skip?: boolean;
}
```

> Note: When changing route options, you must restart the server for the changes to take effect.

### `environments`

Controls which environments this route should be registered in. This is not standardised, so you can specify any environment you want. As long as `NODE_ENV` is set to one of the values, the route will be registered.

This value coincides with the `environmentRoutes` option. If this option is set, it will take precedence over `environmentRoutes`. 

Rules this property follows:

- When omitted, registration is controlled depending on the `environmentRoutes` option.
- Providing any environment will **win** over `environmentRoutes`.
- Setting this to `*` will register the route in all environments, regardless of `environmentRoutes`.

Default: `undefined`

### `isIndex`

Whether this route should be treated as an index route. This route will be instead mounted at the parent directory, or will 'navigate up' a directory.

This value takes precedence over `indexNames`.

Default: `false`

### `notImplemented`

Sometimes you may require the route to still be publicly accessible, but don't want to perform it's default behaviour. You can provide custom logic to handle the request instead.

Example: You may want to temporarily disable a login/register route, but still want to return a 200 response. The choice is yours.

If this value is provided, this will be registered as the route handler instead of the default export.

Default: `undefined`

### `skip`

Whether to skip this route entirely.

Default: `false`

See the [examples](examples) for more information.

## Caveats

Currently, when exporting the `routeOptions` object, if your file contains multiple routes, all routes will be affected by the options. This is a limitation of the current implementation and will be addressed in a future release.

```typescript
import express from 'express';

import type { RouteHandlerOptions } from 'express-fs-routes';

const router = express.Router();

router.get("/foo", (req, res) => {
  res.json({ message: 'foo' });
});

router.get("/bar", (req, res) => {
  res.json({ message: 'bar' });
});

export default router

export const routeOptions: RouteHandlerOptions = {
  environments: ['production'],
  notImplemented: (req, res) => {
    res.status(503).json({ message: 'This route is currently unavailable' });
  }
};

// all routes, both GET /foo and GET /bar will be affected by the options

```

## FAQ

Coming soon...

## TypeScript

This package is written in TypeScript and provides type definitions for the exported functions. 

## Resources

- [Express](https://expressjs.com/)
- [Change Log](CHANGELOG.md)
- [License](LICENSE)
