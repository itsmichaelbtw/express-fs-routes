import path from "path";
import fs from "fs";

import type { Request, Response, NextFunction } from "express";

export function getUsers() {
    return async (req: Request, res: Response, next: NextFunction) => {
        const users = await fs.promises.readFile(
            path.join(process.cwd(), "..", "database/users.json"),
            "utf-8"
        );

        req.users = JSON.parse(users);
        next();
    };
}
