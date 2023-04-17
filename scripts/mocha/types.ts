import type { RouterOptions } from "../../lib";

export interface GenerateRoutes {
  absolute: string;
  route_options: RouterOptions;
  template?: (...args: any[]) => string;
}
