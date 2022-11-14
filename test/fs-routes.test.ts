import chai from "chai";
import path from "path";
import request from "supertest";
import envAgent from "env-agent";

import { registerRoutes } from "../lib/register";
import { spawnServer, startServer, closeServer } from "../scripts/server";

envAgent.load({
    path: path.join(__dirname, ".env")
});

const expect = chai.expect;
const app = spawnServer();
const server = startServer(app);

describe("fs-routes", () => {
    before(() => {
        registerRoutes(app, {
            directory: path.join(__dirname, "..", "examples/routes")
        });
    });

    after(() => {
        closeServer(server);
    });

    it("should return 200", async () => {
        const response = await request(app).get("/");

        expect(response.status).to.equal(200);
    });
});
