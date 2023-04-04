# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.2.0](https://github.com/itsmichaelbtw/express-fs-routes/compare/v2.1.1...v2.2.0) (2023-04-04)


### Fixed

* express examples not starting up ([4f20108](https://github.com/itsmichaelbtw/express-fs-routes/commit/4f20108b52e699587db32549e034ab18d9899da6))
* reworked examples ([48ad904](https://github.com/itsmichaelbtw/express-fs-routes/commit/48ad90480b96e7f89eac8c7fcc9544dbcd6ade88))


### What's New

* added routeMetadata to express request object ([7823ca1](https://github.com/itsmichaelbtw/express-fs-routes/commit/7823ca1a97bfc738ad590f3903ae925d4411c605))
* added support for metadata and beforeRegistration hook ([c581e7f](https://github.com/itsmichaelbtw/express-fs-routes/commit/c581e7f6575df626df49e55ab79993ce035ceb70))

### [2.1.1](https://github.com/itsmichaelbtw/express-fs-routes/compare/v2.1.0...v2.1.1) (2023-03-15)


### What's New

* updated internal documentation ([d8b01a8](https://github.com/itsmichaelbtw/express-fs-routes/commit/d8b01a857d18e2107adb4d933e71b3967ab82060))

## [2.1.0](https://github.com/itsmichaelbtw/express-fs-routes/compare/v2.0.0...v2.1.0) (2023-02-05)


### Fixed

* file stats lookup is now asynchronous to not cause thread blocks ([a78b520](https://github.com/itsmichaelbtw/express-fs-routes/commit/a78b520999da8d7cb74bf8a7e483d66ae5652f39))
* importing a module threw an error when `routeOptions` is not defined ([c8b8474](https://github.com/itsmichaelbtw/express-fs-routes/commit/c8b8474ca91da20f39ff436a20bcf4c270b7f139))
* internal errors not logging with error call stack ([1cce961](https://github.com/itsmichaelbtw/express-fs-routes/commit/1cce9618a0fb83f265f04d779f7db7ff67c2f2f3))
* missing constructor values now throw proper errors ([62c7f0c](https://github.com/itsmichaelbtw/express-fs-routes/commit/62c7f0c1ab850df964cf3849665a315adb1e728f))


### What's New

* added support for typescript and esm projects ([748866b](https://github.com/itsmichaelbtw/express-fs-routes/commit/748866b58758417cdb8a724f188abee14c23e07d))

## [2.0.0](https://github.com/itsmichaelbtw/express-fs-routes/compare/v1.0.1...v2.0.0) (2023-02-02)


### ⚠ BREAKING CHANGES

* This feature introduces a new way to register routes in Express and requires change to existing code by instantiating the new `RouteEngine` class.

### What's New

* added internal utils for async reducer ([d3322b0](https://github.com/itsmichaelbtw/express-fs-routes/commit/d3322b0a239dca8ca32ade2abb9e882d077279d0))
* changed default options for route engine ([96a503d](https://github.com/itsmichaelbtw/express-fs-routes/commit/96a503dd67f10bbc518f7b4ea15ea6c72b5c3ca3))
* improved overall exportable types including JSDoc comments ([a71bfc2](https://github.com/itsmichaelbtw/express-fs-routes/commit/a71bfc25d52de8853a94655e944b832fb4bde4b3))
* new routing engine class for express route registration ([41d4f4b](https://github.com/itsmichaelbtw/express-fs-routes/commit/41d4f4b5827dfb02ee963444723959a46f496475))
* revised file output with file path redact support ([d3b2203](https://github.com/itsmichaelbtw/express-fs-routes/commit/d3b22031eceadfccd998843b298bf83dd8b1a3d8))

### [1.0.1](https://github.com/itsmichaelbtw/express-fs-routes/compare/v1.0.0...v1.0.1) (2022-11-16)


### Fixed

* **fs-routes:** multiple handler stacks not registering correctly ([3e1cb0e](https://github.com/itsmichaelbtw/express-fs-routes/commit/3e1cb0e706c32b55531caf82c1f78a50a11ecd43))
* process.env.NODE_ENV is now evualuated on each call ([9a569b1](https://github.com/itsmichaelbtw/express-fs-routes/commit/9a569b127801f87b414dbcadee9927b66351f198))

## 1.0.0 (2022-11-14)


### What's New

* **fs-routes:** create a directory tree from a given path ([c613328](https://github.com/itsmichaelbtw/express-fs-routes/commit/c613328b44d62ee1c14e53ee77c5526ef7a8a34b))
* **fs-routes:** register routes using the file system ([66dda5f](https://github.com/itsmichaelbtw/express-fs-routes/commit/66dda5fe9a55cea3bc8f67007af58a671cfc46bf))
* **fs-routes:** utility functions for internal use ([35f05c6](https://github.com/itsmichaelbtw/express-fs-routes/commit/35f05c6ee444e87f76c1123ccc41790f8d4ec5be))
* support for redacted file paths ([f9dd61f](https://github.com/itsmichaelbtw/express-fs-routes/commit/f9dd61ffffe3429d02d470ff55ad549880dca4b2))
* **types:** route options now supports a `notImplemented` callback ([b298617](https://github.com/itsmichaelbtw/express-fs-routes/commit/b298617de9f1f5c88191828366296116bc6fb043))
* **types:** support for reusable typings ([771b19a](https://github.com/itsmichaelbtw/express-fs-routes/commit/771b19a77ffcd8743164f9baf6f57c6b9749e893))


### Fixed

* extended url paths not appending properly to route url ([930adc2](https://github.com/itsmichaelbtw/express-fs-routes/commit/930adc226df7f9981e981de8c94aa61ccd531818))
* **fs-routes:** converting urls to regex returns inconsistent strings ([f78444b](https://github.com/itsmichaelbtw/express-fs-routes/commit/f78444b780c6786b41f565ac9b6d9f9b071f0be5))
* incorrect method types for express router methods ([8364404](https://github.com/itsmichaelbtw/express-fs-routes/commit/8364404649e06a38159416cb30beeb6a796c2f14))
* **type:** `paramsToken` property was attached to the wrong interface ([c807407](https://github.com/itsmichaelbtw/express-fs-routes/commit/c807407da69187106a3635e7dc572d6593f0b316))
* **types:** incorrect express application type ([82b85dd](https://github.com/itsmichaelbtw/express-fs-routes/commit/82b85ddaa1feddf5765af9f093d87e2c12332987))
