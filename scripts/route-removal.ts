import express from "express";

export function destroyAllRoutes(app: express.Express): void {
    app._router.stack = app._router.stack.filter((layer: any) => {
        return layer.name !== "router";
    });
}
