import { minify, enforceComment } from "./utils";

export function withDefault(append = ""): string {
    const minified = minify(`
        import express from "express";

        const router = express.Router({ mergeParams: true });

        router.get("/", (req, res) => {
            res.status(200).send(req.originalUrl);
        });

        export default router;

        ${append}
    `);

    return enforceComment(minified);
}

export function withParams(append = ""): string {
    const minified = minify(`
        import express from "express";

        const router = express.Router({ mergeParams: true });

        router.get("/", (req, res) => {
            res.status(200).send(req.params);
        });

        export default router;

        ${append}
    `);

    return enforceComment(minified);
}

export function withError(): string {
    const minified = minify(`
        import express from "express";

        const router = express.Router({ mergeParams: true });

        router.get("/", (req, res) => {
            res.status(200).send(req.params);
        });
    `);

    return enforceComment(minified);
}
