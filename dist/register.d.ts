import express from "express";
import type { RouteRegistrationOptions } from "./types";
type ExpressApp = express.Application;
export declare function registerRoutes(app: ExpressApp, options?: RouteRegistrationOptions): void;
export {};
