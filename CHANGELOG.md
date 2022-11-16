# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
