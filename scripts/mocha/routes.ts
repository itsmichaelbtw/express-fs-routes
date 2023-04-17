import type { GenerateRoutes } from "./types";

import { withDefault, withError, withParams } from "./templates";
import { join } from "./utils";

export const MOCHA_ROUTES: GenerateRoutes[] = [
  {
    absolute: join("error.ts"),
    route_options: {},
    template: withError
  },
  {
    absolute: join("root.ts"),
    route_options: {}
  },
  {
    absolute: join("engine_options", "environment_routes", "development", "index.ts"),
    route_options: {}
  },
  {
    absolute: join("engine_options", "environment_routes", "production", "index.ts"),
    route_options: {}
  },
  {
    absolute: join("engine_options", "environment_routes", "mixed", "index.ts"),
    route_options: {}
  },
  {
    absolute: join("engine_options", "index_names", "custom_index.ts"),
    route_options: {}
  },
  {
    absolute: join("engine_options", "index_names", "index.ts"),
    route_options: {}
  },
  {
    absolute: join("engine_options", "params", "[custom].ts"),
    route_options: {}
  },
  {
    absolute: join("engine_options", "params", "[nested]", "[token].ts"),
    route_options: {}
  },
  {
    absolute: join("handler_options", "environments", "development.ts"),
    route_options: {
      environments: ["development"]
    }
  },
  {
    absolute: join("handler_options", "environments", "production.ts"),
    route_options: {
      environments: ["production"]
    }
  },
  {
    absolute: join("handler_options", "environments", "mixed.ts"),
    route_options: {
      environments: ["development", "production", "test"]
    }
  },
  {
    absolute: join("handler_options", "environments", "wild_card.ts"),
    route_options: {
      environments: ["*"]
    }
  },
  {
    absolute: join("handler_options", "is_index", "path.ts"),
    route_options: {
      isIndex: true
    }
  },
  {
    absolute: join("handler_options", "is_index", "index.ts"),
    route_options: {
      isIndex: false
    }
  },
  {
    absolute: join("handler_options", "skip.ts"),
    route_options: {
      skip: true
    }
  },
  {
    absolute: join("handler_options", "params_regex", "[custom].ts"),
    route_options: {
      paramsRegex: {
        custom: "custom_[a-zA-Z0-9]+"
      }
    }
  },
  {
    absolute: join("handler_options", "params_regex", "[nested]", "[regex].ts"),
    route_options: {
      paramsRegex: {
        nested: "nested_[a-zA-Z0-9]+",
        regex: "regex_[a-zA-Z0-9]+"
      }
    }
  },
  {
    absolute: join("handler_options", "params_regex", "[missing]", "[regex].ts"),
    route_options: {
      paramsRegex: {
        regex: "regex_[a-zA-Z0-9]+"
      }
    }
  },
  {
    absolute: join("handler_options", "metadata.ts"),
    route_options: {
      metadata: {
        my_custom_metadata: "my_custom_metadata"
      }
    }
  },
  {
    absolute: join("params", "[param_one]", "[param_two].ts"),
    route_options: {
      paramsRegex: {
        param_one: "param_one_[a-zA-Z0-9]+",
        param_two: "param_two_[a-zA-Z0-9]+"
      }
    },
    template: withParams
  }
];
