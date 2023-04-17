import fs from "fs-extra";

import { withDefault } from "./templates";
import { MOCHA_ROUTES } from "./routes";

for (const route of MOCHA_ROUTES) {
  const append = `export const routeOptions = ${JSON.stringify(route.route_options, null, 4)};`;

  if (typeof route.template === "function") {
    fs.outputFileSync(route.absolute, route.template(append));
  } else {
    fs.outputFileSync(route.absolute, withDefault(append));
  }
}
