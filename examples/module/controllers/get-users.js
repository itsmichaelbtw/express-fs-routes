import path from "path";
import fs from "fs";

export function getUsers() {
  return async (req, res, next) => {
    const users = await fs.promises.readFile(
      path.join(process.cwd(), "..", "database/users.json"),
      "utf-8"
    );
    req.users = JSON.parse(users);
    next();
  };
}
