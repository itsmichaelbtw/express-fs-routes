const path = require("path");
const fs = require("fs");

function getUsers() {
    return async (req, res, next) => {
        const users = await fs.promises.readFile(
            path.join(process.cwd(), "..", "database/users.json"),
            "utf-8"
        );
        req.users = JSON.parse(users);
        next();
    };
}

module.exports.getUsers = getUsers;
