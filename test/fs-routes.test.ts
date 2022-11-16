import chai from "chai";
import path from "path";
import fs from "fs";
import http from "http";
import request from "supertest";
import envAgent from "env-agent";

import { registerRoutes, DirTree, RouteRegistry } from "../lib";
import { spawnServer, startServer, closeServer } from "../scripts/server";
import { destroyAllRoutes } from "../scripts/route-removal";

function join(...pathName: string[]): string {
    return path.join(__dirname, "..", ...pathName);
}

function getRegistry(): RouteRegistry {
    return JSON.parse(fs.readFileSync(path.join(outputDir, "route_registry.json"), "utf8"));
}

function getDirTree(): DirTree {
    return JSON.parse(fs.readFileSync(path.join(outputDir, "directory_tree.json"), "utf8"));
}

envAgent.load({
    path: join(".env.test"),
    overwrite: true
});

const expect = chai.expect;
const app = spawnServer();

const examplesDir = join("examples/routes");
const outputDir = join("examples/.fs-routes");

let server: http.Server;

describe("fs-routes", () => {
    before(() => {
        server = startServer(app);
    });

    after(() => {
        closeServer(server);
    });

    afterEach(() => {
        destroyAllRoutes(app);
    });

    describe("routeRegistration()", () => {
        it("should register routes", async () => {
            registerRoutes(app, {
                directory: examplesDir,
                output: outputDir
            });
            const routeRegistry = getRegistry();
            for (const route of routeRegistry) {
                if (route.status === "registered") {
                    const method = route.method.toLowerCase();
                    const response = await request(app)[method](route.full_path);
                    if (route.routeOptions.notImplemented) {
                        expect(response.status).to.equal(501);
                    } else {
                        expect(response.status).to.equal(200);
                    }
                } else if (route.status === "skipped") {
                    const response = await request(app).get(route.full_path);
                    expect(response.status).to.equal(404);
                }
            }
        });
        it("should throw an error when silent is `false`", async () => {
            expect(() => {
                registerRoutes(app, {
                    directory: "fake/path",
                    output: null,
                    silent: false
                });
            }).to.throw();
        });
        it("should prepend an `appMount` to all routes", async () => {
            registerRoutes(app, {
                directory: examplesDir,
                appMount: "/api",
                output: outputDir
            });
            const routeRegistry = getRegistry();
            for (const route of routeRegistry) {
                expect(route.full_path).to.match(/^\/api/);
            }
        });
        it("should allow routes to be registered in certain environments", async () => {
            registerRoutes(app, {
                directory: examplesDir,
                output: outputDir,
                environmentRoutes: {
                    development: ["environments"]
                }
            });
            envAgent.set("NODE_ENV", "development");
            const routeRegistry = getRegistry();
            for (const route of routeRegistry) {
                if (
                    route.full_path.includes("environments") &&
                    route.routeOptions.environments === undefined
                ) {
                    expect(route.status).to.equal("registered");
                }
            }
        });
    });

    describe("[METHOD] /basic", () => {
        it("extended paths should work", async () => {
            registerRoutes(app, {
                directory: examplesDir,
                output: null
            });

            const response = await request(app).get("/basic/extended_urls/route");

            expect(response.status).to.equal(200);
        });

        it("multiple route files should register as normal", async () => {
            registerRoutes(app, {
                directory: examplesDir,
                output: null
            });

            const [fetch, create] = await Promise.all([
                request(app).get("/basic/controllers/fetch"),
                request(app).post("/basic/controllers/create")
            ]);

            expect(fetch.status).to.equal(200);
            expect(create.status).to.equal(200);
        });

        it("index routes should act upon the parent directory", async () => {
            registerRoutes(app, {
                directory: examplesDir,
                output: null
            });

            const response = await request(app).get("/basic");

            expect(response.status).to.equal(200);
        });

        it("environment specific routes should be registered accordingly (development)", async () => {
            envAgent.set("NODE_ENV", "development");

            registerRoutes(app, {
                directory: examplesDir,
                output: null
            });

            const [success, failed] = await Promise.all([
                request(app).get("/basic/environments/development"),
                request(app).get("/basic/environments/production")
            ]);

            expect(success.status).to.equal(200);
            expect(failed.status).to.equal(404);
        });

        it("environment specific routes should be registered accordingly (production)", async () => {
            envAgent.set("NODE_ENV", "production");

            registerRoutes(app, {
                directory: examplesDir,
                output: null
            });

            const [success, failed] = await Promise.all([
                request(app).get("/basic/environments/production"),
                request(app).get("/basic/environments/development")
            ]);

            expect(success.status).to.equal(200);
            expect(failed.status).to.equal(404);
        });
    });

    describe("[METHOD] /advanced", () => {
        it("providing a `notImplement` property should return a 501", async () => {
            registerRoutes(app, {
                directory: examplesDir,
                output: null
            });

            const response = await request(app).get("/advanced/not_implemented");

            expect(response.status).to.equal(501);
        });
    });

    describe("output", () => {
        it("should output a `route_registry.json` file", async () => {
            registerRoutes(app, {
                directory: examplesDir,
                output: outputDir
            });

            const routeRegistry = getRegistry();

            expect(routeRegistry).to.be.an("array");
            expect(routeRegistry.length).to.be.greaterThan(0);
        });

        it("should output a `directory_tree.json` file", async () => {
            registerRoutes(app, {
                directory: examplesDir,
                output: outputDir
            });

            const directoryTree = getDirTree();

            expect(directoryTree).to.be.an("object");
            expect(directoryTree).to.have.property("name");
            expect(directoryTree).to.have.property("path");
            expect(directoryTree).to.have.property("type");
            expect(directoryTree).to.have.property("children");
            expect(directoryTree.children).to.be.an("array");
        });

        it("should redact file paths when `true`", async () => {});
    });
});
