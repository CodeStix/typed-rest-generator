/* DO NOT MODIFY, THIS FILE WAS GENERATED */

import type c from "express-serve-static-core";
import type p from "qs";

export type EndpointsConstraint = {
    [M in "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head"]: {
        [path: string]: {
            req: object | never;
            res: object | never;
        };
    };
};

declare module "express-serve-static-core" {
    // This is why get isn't type checked, we cannot override its default typing
    export interface Application {
        get: ((name: string) => any) & IRouterMatcher<this, "get">;
    }

    export interface IRouterMatcher<T, Method extends "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head" = any> {
        <
            Path extends keyof U[Method],
            P = c.ParamsDictionary,
            ReqQuery = p.ParsedQs,
            Locals extends Record<string, any> = Record<string, any>,
            U extends EndpointsConstraint = Endpoints
        >(
            path: Path,
            // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
            ...handlers: Array<c.RequestHandler<P, U[Method][Path]["req"], U[Method][Path]["res"], ReqQuery, Locals>>
        ): T;
        <
            Path extends keyof U[Method],
            P = c.ParamsDictionary,
            ReqQuery = p.ParsedQs,
            Locals extends Record<string, any> = Record<string, any>,
            U extends EndpointsConstraint = Endpoints
        >(
            path: Path,
            // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
            ...handlers: Array<c.RequestHandlerParams<P, U[Method][Path]["req"], U[Method][Path]["res"], ReqQuery, Locals>>
        ): T;
    }
}
import { Post, User, Gender, Routes, Validation, ValidationContext } from "./index"
import { CallTracker } from "assert"


export type Endpoints = {
	post: {
		"/post": {
                req: Routes.PostPostRequest,
                res: Routes.PostPostResponse,
            },
	},
	get: {
		"/user": {
                req: Routes.GetUserRequest,
                res: Routes.GetUserResponse,
            },
		"/user/post": {
                req: Routes.GetUserPostRequest,
                res: never,
            },
	},
	put: {
	},
	delete: {
	},
	patch: {
	},
	options: {
	},
	head: {
	},
	all: {
	},
}



export async function defaultFetcher(url: any, method: any, body: any) {
    let res = await fetch(url, {
        method,
        body: typeof body === "object" ? JSON.stringify(body) : null,
        headers: { "Content-Type": "application/json" },
    });
    if (res.status === 200) {
        return await res.json();
    } else if (res.status === 401) {
        throw new Error(`Unauthorized. To implement authorization, override fetcher in the client settings.`);
    } else if (res.status === 404 || (res.status > 200 && res.status < 300)) {
        return null;
    } else {
        throw new Error(`Could not fetch '${method}' (HTTP ${res.status}: ${res.statusText})`);
    }
}

export interface ClientSettings {
    path?: string;
    fetcher?: (url: string, method: string, body?: object) => Promise<any>;
}

export class BaseClient<Endpoints extends EndpointsConstraint> {
    public readonly settings: ClientSettings;

    public constructor(settings: ClientSettings = {}) {
        settings.path ||= "";
        settings.fetcher ||= defaultFetcher;
        if (settings.path.endsWith("/")) settings.path = settings.path.substring(0, settings.path.length - 1);
        this.settings = settings;
    }

    public fetch<Method extends keyof EndpointsConstraint, Path extends keyof Endpoints[Method]>(
        method: Method,
        path: Path,
        body?: Endpoints[Method][Path]["req"]
    ): Promise<Endpoints[Method][Path]["res"]> {
        return this.settings.fetcher!(path as string, method, body);
    }
}

export class Client extends BaseClient<Endpoints> {
public async postPost (data: Routes.PostPostRequest): Promise<Routes.PostPostResponse> {
                return await this.fetch("post", "/post", data);
            }

public async getUser (data: Routes.GetUserRequest): Promise<Routes.GetUserResponse> {
                return await this.fetch("get", "/user", data);
            }

public async getUserPost (data: Routes.GetUserPostRequest): Promise<void> {
                await this.fetch("get", "/user/post", data);
            }
}

export const SCHEMAS: {
    [typeName: string]: TypeSchema
} = {"Post":{"type":"isObject","schema":{"id":{"type":"or","schemas":[{"type":"isType","value":"string"},{"type":"isType","value":"number"}]},"title":{"type":"isType","value":"string"},"content":{"type":"isType","value":"string"},"userId":{"type":"isType","value":"number"}}},"User":{"type":"isObject","schema":{"id":{"type":"isType","value":"number"},"email":{"type":"isType","value":"string"},"password":{"type":"isType","value":"string"},"birthDate":{"type":"ref","value":"Date"},"gender":{"type":"ref","value":"Gender"},"tracker":{"type":"ref","value":"CallTracker"}}},"Gender":{"type":"unknown"},"CallTracker":{"type":"isObject","schema":{}},"RoutesGetUserPostRequest":{"type":"and","schemas":[{"type":"function","name":"Validation.validatePostPostRequest"},{"type":"isObject","schema":{"id":{"type":"isType","value":"number"},"text":{"type":"isType","value":"string"}}}]},"RoutesPostPostResponse":{"type":"and","schemas":[{"type":"function","name":"Validation.validatePostPostResponse"},{"type":"isObject","schema":{"post":{"type":"ref","value":"Post"}}}]},"RoutesGetUserRequest":{"type":"and","schemas":[{"type":"function","name":"Validation.validateGetUserRequest"},{"type":"isObject","schema":{"id":{"type":"isType","value":"number"}}}]},"RoutesGetUserResponse":{"type":"and","schemas":[{"type":"function","name":"Validation.validateGetUserResponse"},{"type":"isObject","schema":{"user":{"type":"ref","value":"User"}}}]},"ValidationContext":{"type":"and","schemas":[{"type":"function","name":"Validation.validateContext"},{"type":"isObject","schema":{"currentUser":{"type":"ref","value":"User"}}}]}};

expor const CUSTOM_VALIDATORS = {
	"Validation.validatePostPostRequest": Validation.validatePostPostRequest,
	"Validation.validatePostPostResponse": Validation.validatePostPostResponse,
	"Validation.validateGetUserRequest": Validation.validateGetUserRequest,
	"Validation.validateGetUserResponse": Validation.validateGetUserResponse,
	"Validation.validateContext": Validation.validateContext
}

export type TypeSchema =
    | { type: "and" | "or"; schemas: TypeSchema[] }
    | { type: "ref"; value: string }
    | { type: "function"; name: string }
    | { type: "isType"; value: "string" | "boolean" | "number" | "object" }
    | { type: "isValue"; value: any }
    | { type: "isArray"; itemSchema: TypeSchema }
    | { type: "isObject"; schema: { [key: string]: TypeSchema } }
    | { type: "isTuple"; itemSchemas: TypeSchema[] }
    | { type: "true" }
    | { type: "false" }
    | { type: "unknown" };

export interface BaseValidationContext {
    otherSchemas?: { [typeName: string]: TypeSchema };
    customValidators?: { [typeName: string]: (value: any, context: BaseValidationContext) => any };
    abortEarly?: boolean;
}

export function validate<Context extends BaseValidationContext>(schema: TypeSchema, value: any, context: Context): any {
    switch (schema.type) {
        case "isType":
            return typeof value === schema.value ? null : `must be of type ${schema.value}`;
        case "isValue":
            return value === schema.value ? null : `must have value ${JSON.stringify(schema.value)}`;
        case "isObject": {
            if (typeof value !== "object" || !value) return "invalid object";
            let keys = Object.keys(schema.schema);
            let err: any = {};
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let res = validate(schema.schema[key], value[key], context);
                if (res) {
                    err[key] = res;
                    if (context.abortEarly) return err;
                }
            }
            return Object.keys(err).length > 0 ? err : null;
        }
        case "isArray": {
            if (!Array.isArray(value)) return "invalid array";
            let err: any = {};
            for (let i = 0; i < value.length; i++) {
                let item = value[i];
                let res = validate(schema.itemSchema, item, context);
                if (res) {
                    err[i] = res;
                    if (context.abortEarly) return err;
                }
            }
            return Object.keys(err).length > 0 ? err : null;
        }
        case "isTuple": {
            if (!Array.isArray(value)) return "invalid tuple";
            if (value.length !== schema.itemSchemas.length) return "invalid tuple length";
            let err: any = {};
            for (let i = 0; i < schema.itemSchemas.length; i++) {
                let item = value[i];
                let res = validate(schema.itemSchemas[i], item, context);
                if (res) {
                    err[i] = res;
                    if (context.abortEarly) return err;
                }
            }
            return Object.keys(err).length > 0 ? err : null;
        }
        case "or": {
            let lastError = "empty or";
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                lastError = validate(sch, value, context);
                if (!lastError) return null;
            }
            return lastError;
        }
        case "and": {
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let res = validate(sch, value, context);
                if (res) return res;
            }
            return null;
        }
        case "true":
            return null;
        case "false":
            return "this value may not exist";
        case "function":
            let fn = context.customValidators?.[schema.name];
            if (!fn) throw new Error(`Custom validator '${schema.name}' not found`);
            return fn(value as any, context as any);
        case "ref":
            let sch = context.otherSchemas?.[schema.value];
            if (!sch) throw new Error(`Could not find validator for type '${schema.value}'`);
            return validate(context.otherSchemas![schema.value], value, context);
        case "unknown":
            throw new Error("Cannot validate unknown type.");
    }
}

    