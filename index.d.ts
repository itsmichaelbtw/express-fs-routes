declare namespace Express {
  interface Request {
    /**
     * An `express-fs-routes` property used for custom
     * metadata that can be attached to the request.
     * This is defined inside the route file which is
     * exported by `routeOptions.metadata` property.
     *
     * @default {}
     */
    routeMetadata: Record<string, any>;
  }
}
