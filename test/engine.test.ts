import chai from "chai";
import path from "path";
import fs from "fs-extra";
import http from "http";
import supertest from "supertest";
import envAgent from "env-agent";

import {
    RouteEngine,
    DirectoryTree,
    RouteRegistry,
    RouteSchema,
    RouteRegistrationOptions
} from "../lib";
import { spawnServer, startServer, closeServer } from "../scripts/server";
import { destroyAllRoutes } from "../scripts/route-removal";

function join(...pathName: string[]): string {
    return path.join(__dirname, "..", ...pathName);
}

envAgent.load({
    path: join(".env.test"),
    overwrite: true
});

const expect = chai.expect;
const app = spawnServer();
const directory = join("examples/mocha");

const fsRoutes = new RouteEngine(app, "commonjs");

function mergeOptions(options: Partial<RouteRegistrationOptions>) {
    return Object.assign({}, fsRoutes.options, options);
}

fsRoutes.setOptions({
    directory: directory,
    output: false
});

const cacheOptions = fsRoutes.options;

let server: http.Server;

describe("routing engine", () => {
    before(() => {
        server = startServer(app);
    });

    after(() => {
        closeServer(server);
    });

    afterEach(() => {
        destroyAllRoutes(app);
        fsRoutes.setOptions(cacheOptions);
    });

    it("should register routes", async () => {
        const registry = await fsRoutes.registerRoutes();

        for (const route of registry) {
            if (route.status === "registered" && !route.route_options.paramsRegex) {
                await supertest(app).get(route.full_path).expect(200);
            }
        }
    });

    it("should register routes with params", async () => {
        const registry = await fsRoutes.registerRoutes();

        const result = await supertest(app).get("/params/param_one_123/param_two_456");

        expect(result.status).to.equal(200);
        expect(result.body).to.haveOwnProperty("param_one", "param_one_123");
        expect(result.body).to.haveOwnProperty("param_two", "param_two_456");
    });

    it("should convert the slug to a regex", async () => {
        const registry = await fsRoutes.registerRoutes();

        const nested = registry.find((route) => {
            return route.absolute_path.includes("[nested]");
        }) as RouteSchema;

        const custom = registry.find((route) => {
            return route.absolute_path.includes("[custom]");
        }) as RouteSchema;

        expect(nested.full_path.endsWith("/:nested/:token")).to.be.true;
        expect(custom.full_path.endsWith("/:custom")).to.be.true;
    });

    it("should throw an error if no app is passed", () => {
        expect(() => {
            // @ts-ignore
            new RouteEngine(null, "commonjs");
        }).to.throw("No app was passed to the route engine.");
    });

    it("should throw an error if an incorrect context is passed", () => {
        expect(() => {
            // @ts-ignore
            new RouteEngine(app, "invalid");
        }).to.throw("The engine expected a valid context. Must be either 'commonjs' or 'module'.");
    });

    describe("engine options", () => {
        describe("directory", () => {
            it("should accept relative paths", async () => {
                fsRoutes.setOptions(mergeOptions({ directory: "examples/mocha" }));

                await fsRoutes.registerRoutes();
                await supertest(app).get("/root").expect(200);

                expect(fsRoutes.absoluteDirectory).to.equal(directory);
            });

            it("should accept absolute paths", async () => {
                fsRoutes.setOptions(mergeOptions({ directory: directory }));

                await fsRoutes.registerRoutes();
                await supertest(app).get("/root").expect(200);

                expect(fsRoutes.absoluteDirectory).to.equal(directory);
            });
        });

        describe("appMount", () => {
            it("should append the appMount to the route path", async () => {
                fsRoutes.options.appMount = "/api";

                const registry = await fsRoutes.registerRoutes();

                for (const route of registry) {
                    if (route.status === "registered") {
                        expect(route.full_path.startsWith("/api")).to.equal(true);
                    }
                }
            });
        });

        describe("environmentRoutes", () => {
            const development = "engine_options/environment_routes/development";
            const production = "engine_options/environment_routes/production";
            const mixed = "engine_options/environment_routes/mixed";

            it("should register routes in the current environment", async () => {
                envAgent.set("NODE_ENV", "production", true);

                fsRoutes.options.environmentRoutes = {
                    development: [development],
                    production: [production, mixed],
                    test: [mixed]
                };

                const registry = await fsRoutes.registerRoutes();

                for (const route of registry) {
                    if (route.full_path.includes(development)) {
                        expect(route.status).to.equal("skipped");
                    }

                    if (route.full_path.includes(production)) {
                        expect(route.status).to.equal("registered");
                    }

                    if (route.full_path.includes(mixed)) {
                        expect(route.status).to.equal("registered");
                    }
                }

                envAgent.set("NODE_ENV", "test", true);

                const registry2 = await fsRoutes.registerRoutes();

                for (const route of registry2) {
                    if (route.full_path.includes(development)) {
                        expect(route.status).to.equal("skipped");
                    }

                    if (route.full_path.includes(production)) {
                        expect(route.status).to.equal("skipped");
                    }

                    if (route.full_path.includes(mixed)) {
                        expect(route.status).to.equal("registered");
                    }
                }
            });

            it("should allow absolute paths", async () => {
                envAgent.set("NODE_ENV", "development", true);

                fsRoutes.options.environmentRoutes = {
                    development: [path.join(directory, development)],
                    production: [path.join(directory, production)],
                    test: [path.join(directory, mixed)]
                };

                const registry = await fsRoutes.registerRoutes();

                for (const route of registry) {
                    if (route.full_path.includes(development)) {
                        expect(route.status).to.equal("registered");
                    }

                    if (route.full_path.includes(production)) {
                        expect(route.status).to.equal("skipped");
                    }

                    if (route.full_path.includes(mixed)) {
                        expect(route.status).to.equal("skipped");
                    }
                }
            });
        });

        describe("indexNames", () => {
            const index = "engine_options/index_names/index";
            const customIndex = "engine_options/index_names/custom_index";

            it("should register routes at the base path", async () => {
                const registry = await fsRoutes.registerRoutes();

                for (const route of registry) {
                    if (route.absolute_path.includes(index)) {
                        expect(route.full_path.endsWith("/index")).to.be.false;
                    }
                }
            });

            it("should allow for multiple index names", async () => {
                fsRoutes.options.indexNames = ["index.js", "custom_index.js"];

                const registry = await fsRoutes.registerRoutes();

                for (const route of registry) {
                    if (route.absolute_path.includes(index)) {
                        expect(route.full_path.endsWith("/index")).to.be.false;
                    }

                    if (route.absolute_path.includes(customIndex)) {
                        expect(route.full_path.endsWith("/custom_index")).to.be.false;
                    }
                }
            });

            it("should not allow absolute paths", async () => {
                fsRoutes.options.indexNames = [path.join(directory, index)];

                const registry = await fsRoutes.registerRoutes();

                for (const route of registry) {
                    if (route.absolute_path.includes(index)) {
                        expect(route.full_path).to.include("index");
                    }
                }
            });
        });

        describe("output", () => {
            it("should allow for custom output", async () => {
                fsRoutes.options.output = "custom_output";

                const registry = await fsRoutes.registerRoutes();

                for (const route of registry) {
                    if (route.absolute_path.includes("custom_output")) {
                        expect(route.full_path).to.not.include("custom_output");
                    }
                }

                fs.removeSync(path.join(process.cwd(), "custom_output"));
            });

            it("should allow for absolute paths", async () => {
                fsRoutes.options.output = path.join(directory, "custom_output");

                const registry = await fsRoutes.registerRoutes();

                for (const route of registry) {
                    if (route.absolute_path.includes("custom_output")) {
                        expect(route.full_path).to.not.include("custom_output");
                    }
                }

                fs.removeSync(path.join(directory, "custom_output"));
            });

            it("should not generate an output file if output is false", async () => {
                fsRoutes.options.output = false;

                const registry = await fsRoutes.registerRoutes();

                expect(fs.existsSync(path.join(process.cwd(), RouteEngine.OUTPUT_DIRECTORY))).to.be
                    .false;
            });
        });
    });

    describe("handler options", () => {
        describe("environments", () => {
            const envDir = path.join(directory, "handler_options/environments");

            beforeEach(() => {
                fsRoutes.setOptions(
                    mergeOptions({
                        directory: envDir
                    })
                );
            });

            it("should register routes based on the given environment", async () => {
                envAgent.set("NODE_ENV", "production", true);

                const registry = await fsRoutes.registerRoutes();

                const development = registry.find((route) => {
                    return route.absolute_path.includes("development");
                }) as RouteSchema;

                const production = registry.find((route) => {
                    return route.absolute_path.includes("production");
                }) as RouteSchema;

                const mixed = registry.find((route) => {
                    return route.absolute_path.includes("mixed");
                }) as RouteSchema;

                const wild = registry.find((route) => {
                    return route.absolute_path.includes("wild");
                }) as RouteSchema;

                expect(development.status).to.equal("skipped");
                expect(production.status).to.equal("registered");
                expect(mixed.status).to.equal("registered");
                expect(wild.status).to.equal("registered");
            });

            it("should take precedence over the engine options", async () => {
                envAgent.set("NODE_ENV", "development", true);

                fsRoutes.options.environmentRoutes = {
                    development: ["production"]
                };

                const registry = await fsRoutes.registerRoutes();

                const development = registry.find((route) => {
                    return route.absolute_path.includes("development");
                }) as RouteSchema;

                expect(development.status).to.equal("registered");
            });
        });

        describe("isIndex", () => {
            const indexDir = path.join(directory, "handler_options/is_index");

            beforeEach(() => {
                fsRoutes.setOptions(
                    mergeOptions({
                        directory: indexDir
                    })
                );
            });

            it("should register routes at the parent path", async () => {
                const registry = await fsRoutes.registerRoutes();

                const path = registry.find((route) => {
                    return route.absolute_path.includes("path");
                }) as RouteSchema;

                const index = registry.find((route) => {
                    return route.absolute_path.includes("index");
                }) as RouteSchema;

                expect(path.full_path).to.equal("/");
                expect(index.full_path).to.equal("/index");
            });

            it("should take precedence over the engine options", async () => {
                const registry = await fsRoutes.registerRoutes();

                const index = registry.find((route) => {
                    return route.absolute_path.includes("is_index");
                }) as RouteSchema;

                expect(index.full_path).to.include("/index");
            });
        });

        describe("params regex", () => {
            const paramsDir = path.join(directory, "handler_options/params_regex");

            beforeEach(() => {
                fsRoutes.setOptions(
                    mergeOptions({
                        directory: paramsDir
                    })
                );
            });

            it("should allow a custom path regex to be used", async () => {
                const registry = await fsRoutes.registerRoutes();

                const custom = registry.find((route) => {
                    return route.absolute_path.includes("custom");
                }) as RouteSchema;

                expect(custom.full_path).to.include(custom.route_options.paramsRegex?.custom);
            });

            it("should work with nested and multiple params", async () => {
                const registry = await fsRoutes.registerRoutes();

                const nested = registry.find((route) => {
                    return route.absolute_path.includes("nested");
                }) as RouteSchema;

                expect(nested.full_path).to.include(nested.route_options.paramsRegex?.nested);
            });

            it("should support native RegExp", async () => {
                const registry = await fsRoutes.registerRoutes();

                const native = registry.find((route) => {
                    return route.absolute_path.includes("native");
                }) as RouteSchema;

                expect(native.full_path).to.include(native.route_options.paramsRegex?.native_regex);
            });

            it("should treat missing regex patterns properly", async () => {
                const registry = await fsRoutes.registerRoutes();

                const missing = registry.find((route) => {
                    return route.absolute_path.includes("missing");
                }) as RouteSchema;

                expect(missing.full_path).to.include(":missing");
            });
        });

        describe("skip", () => {
            it("should skip routes that are marked as skipped", async () => {
                const registry = await fsRoutes.registerRoutes();

                const skipped = registry.find((route) => {
                    return route.route_options.skip;
                }) as RouteSchema;

                expect(skipped.status).to.equal("skipped");
            });
        });
    });
});
