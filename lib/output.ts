import fs from "fs";
import path from "path";

import { debug } from "./debug";

export function checkOutputDir(outputDir: string, callback: Function) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    callback(outputDir);
}

export function saveOutputToDisk(location: string, data: any, fileName: string): void {
    try {
        const filePath = path.resolve(path.join(location, fileName));

        data = JSON.stringify(data, null, 2);

        fs.writeFileSync(filePath, data, {
            encoding: "utf8",
            flag: "w"
        });
    } catch (error) {
        debug(error, "red");
    }
}
