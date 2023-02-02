import express, { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
    export interface Request {
        posts: any[];
        users: any[];
    }
}
