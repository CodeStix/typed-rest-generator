/* DO NOT MODIFY, THIS FILE WAS GENERATED */

import type c from "express-serve-static-core";
import type p from "qs";

export type EndpointsConstraint = {
    [M in "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head"]: {
        [path: string]: {
            req: any;
            res: any;
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
            ...handlers: Array<c.RequestHandler<P, U[Method][Path]["res"], U[Method][Path]["req"], ReqQuery, Locals>>
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
            ...handlers: Array<c.RequestHandlerParams<P, U[Method][Path]["res"], U[Method][Path]["req"], ReqQuery, Locals>>
        ): T;
    }
}
import { Routes, Validation, UserWithoutId, Gender } from "./index"


export type Endpoints = {
	post: {
		"/user": {
                req: Routes.PostUserRequest,
                res: Routes.PostUserResponse,
            },
	},
	get: {
		"/users": {
                req: never,
                res: Routes.GetUsersResponse,
            },
		"/user": {
                req: Routes.GetUserRequest,
                res: Routes.GetUserResponse,
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
        return this.settings.fetcher!(this.settings.path! + (path as string), method, body);
    }
}

export class Client extends BaseClient<Endpoints> {
public async postUser (data: Routes.PostUserRequest): Promise<Routes.PostUserResponse> {
                return await this.fetch("post", "/user", data);
            }

public async getUsers (): Promise<Routes.GetUsersResponse> {
                return await this.fetch("get", "/users");
            }

public async getUser (data: Routes.GetUserRequest): Promise<Routes.GetUserResponse> {
                return await this.fetch("get", "/user", data);
            }
}

export const SCHEMAS = {
    "RoutesGetUserRequest": {
        "type": "isObject",
        "schema": {
            "userId": {
                "type": "isType",
                "value": "number"
            }
        }
    },
    "RoutesPostUserRequest": {
        "type": "and",
        "schemas": [
            {
                "type": "isObject",
                "schema": {
                    "user": {
                        "type": "ref",
                        "value": "UserWithoutId"
                    }
                }
            },
            {
                "type": "function",
                "name": "Validation.validatePostPostRequest"
            }
        ]
    },
    "UserWithoutId": {
        "type": "isObject",
        "schema": {
            "email": {
                "type": "isType",
                "value": "string"
            },
            "password": {
                "type": "isType",
                "value": "string"
            },
            "birthDate": {
                "type": "ref",
                "value": "Date"
            },
            "gender": {
                "type": "ref",
                "value": "Gender"
            }
        }
    },
    "Date": {
        "type": "and",
        "schemas": [
            {
                "type": "true"
            },
            {
                "type": "function",
                "name": "Validation.validateDate"
            }
        ]
    },
    "Gender": {
        "type": "and",
        "schemas": [
            {
                "type": "true"
            },
            {
                "type": "function",
                "name": "Validation.validateGender"
            }
        ]
    }
} as const;

export const CUSTOM_VALIDATORS = {
	"Validation.validatePostPostRequest": Validation.validatePostPostRequest,
	"Validation.validateDate": Validation.validateDate,
	"Validation.validateGender": Validation.validateGender
}

export type TypeSchema =
    | { type: "and" | "or"; schemas: readonly TypeSchema[] }
    | { type: "ref"; value: string }
    | { type: "function"; name: string }
    | { type: "isType"; value: "string" | "boolean" | "number" | "object" }
    | { type: "isValue"; value: any }
    | { type: "isArray"; itemSchema: TypeSchema }
    | { type: "isObject"; schema: { [key: string]: TypeSchema } }
    | { type: "isTuple"; itemSchemas: readonly TypeSchema[] }
    | { type: "true" }
    | { type: "false" }
    | { type: "unknown" };

export interface ValidationSettings<Context> {
    otherSchemas?: { [typeName: string]: TypeSchema };
    customValidators?: { [typeName: string]: (value: any, context: Context, settings: ValidationSettings<Context>) => any };
    abortEarly?: boolean;
}

export function validate<Context>(schema: TypeSchema, value: any, context: Context, settings: ValidationSettings<Context>): any {
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
                let res = validate(schema.schema[key], (value as any)[key], context, settings);
                if (res) {
                    err[key] = res;
                    if (settings.abortEarly) return err;
                }
            }
            return Object.keys(err).length > 0 ? err : null;
        }
        case "isArray": {
            if (!Array.isArray(value)) return "invalid array";
            let err: any = {};
            for (let i = 0; i < value.length; i++) {
                let item = value[i];
                let res = validate(schema.itemSchema, item, context, settings);
                if (res) {
                    err[i] = res;
                    if (settings.abortEarly) return err;
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
                let res = validate(schema.itemSchemas[i], item, context, settings);
                if (res) {
                    err[i] = res;
                    if (settings.abortEarly) return err;
                }
            }
            return Object.keys(err).length > 0 ? err : null;
        }
        case "or": {
            let lastError = "empty or";
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                lastError = validate(sch, value, context, settings);
                if (!lastError) return null;
            }
            return lastError;
        }
        case "and": {
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let res = validate(sch, value, context, settings);
                if (res) return res;
            }
            return null;
        }
        case "true":
            return null;
        case "false":
            return "this value may not exist";
        case "function":
            let fn = settings.customValidators?.[schema.name];
            if (!fn) throw new Error(`Custom validator '${schema.name}' not found`);
            return fn(value, context, settings);
        case "ref":
            let sch = settings.otherSchemas?.[schema.value];
            if (!sch) throw new Error(`Could not find validator for type '${schema.value}'`);
            return validate(settings.otherSchemas![schema.value], value, context, settings);
        case "unknown":
            throw new Error("Cannot validate unknown type.");
    }
}
    