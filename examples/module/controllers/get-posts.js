import path from "path";
import fs from "fs";

export function getPosts() {
  return async (req, res, next) => {
    const posts = await fs.promises.readFile(
      path.join(process.cwd(), "..", "database/posts.json"),
      "utf-8"
    );

    req.posts = JSON.parse(posts);
    next();
  };
}
