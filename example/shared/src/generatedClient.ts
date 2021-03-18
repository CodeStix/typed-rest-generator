/* !!!! DO NOT MODIFY, THIS FILE WAS GENERATED !!!! */
/* Generated using typed-rest-generator */

type EndpointsConstraint = {
    [path: string]: {
        req: any;
        res: any;
    };
};

/* ---- Server-side (express) ---- */

import type c from "express-serve-static-core";
import type p from "qs";

export function withValidator(path: keyof Endpoints) {
    return (req: any, res: any, next: any) => {
        let val = PATH_VALIDATORS[path];
        if (!val) return next();
        let err = validate(SCHEMAS[val], req.body, { abortEarly: true });
        if (err === null) {
            return next();
        } else {
            return res.status(406).json(err);
        }
    };
}

declare module "express-serve-static-core" {
    export interface IRouterMatcher<T, Method extends "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head" = any> {
        <Path extends keyof U, P = c.ParamsDictionary, ReqQuery = p.ParsedQs, Locals extends Record<string, any> = Record<string, any>, U extends EndpointsConstraint = Endpoints>(
            path: Path,
            // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
            ...handlers: Array<c.RequestHandler<P, U[Path]["res"], U[Path]["req"], ReqQuery, Locals>>
        ): T;
        <Path extends keyof U, P = c.ParamsDictionary, ReqQuery = p.ParsedQs, Locals extends Record<string, any> = Record<string, any>, U extends EndpointsConstraint = Endpoints>(
            path: Path,
            // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
            ...handlers: Array<c.RequestHandlerParams<P, U[Path]["res"], U[Path]["req"], ReqQuery, Locals>>
        ): T;
    }
}

// interface ITypedRouter {
//     typed: ITypedRouterPostMatcher<this>;
// }
// interface ITypedRouterPostMatcher<T> {
//     <Path extends keyof U, P = c.ParamsDictionary, ReqQuery = p.ParsedQs, Locals extends Record<string, any> = Record<string, any>, U extends EndpointsConstraint = Endpoints>(
//         path: Path,
//         ...handlers: Array<c.RequestHandler<P, U[Path]["res"], U[Path]["req"], ReqQuery, Locals>>
//     ): T;
//     <Path extends keyof U, P = c.ParamsDictionary, ReqQuery = p.ParsedQs, Locals extends Record<string, any> = Record<string, any>, U extends EndpointsConstraint = Endpoints>(
//         path: Path,
//         ...handlers: Array<c.RequestHandlerParams<P, U[Path]["res"], U[Path]["req"], ReqQuery, Locals>>
//     ): T;
// }
// export function typedRouter<T extends c.IRouter>(router: T): T & ITypedRouter {
//     (router as any).typed = (path: keyof Endpoints, ...rest: any[]) => {
//         router.post(path, withValidator(path), ...rest);
//     };
//     return router as any;
// }

/* ---- Validation ---- */

export type Types = {
    [name: string]: TypeSchema;
};
export type NumberTypeSchema = { type: "number"; min?: number; max?: number; minMessage?: string; maxMessage?: string };
export type StringTypeSchema = { type: "string"; min?: number; max?: number; regex?: string; minMessage?: string; maxMessage?: string; regexMessage?: string };
export type ArrayTypeSchema = { type: "array"; itemType: TypeSchema; min?: number; max?: number; minMessage?: string; maxMessage?: string };
export type TypeSchema =
    | { type: "or"; schemas: readonly TypeSchema[] }
    | { type: "ref"; name: string }
    | { type: "objectLiteral"; fields: Types }
    | ArrayTypeSchema
    | { type: "tuple"; itemTypes: readonly TypeSchema[] }
    | { type: "undefined" }
    | { type: "null" }
    | StringTypeSchema
    | { type: "boolean" }
    | { type: "object" }
    | { type: "never" }
    | { type: "date" }
    | { type: "unknown" }
    | { type: "any" }
    | NumberTypeSchema
    | { type: "numberLiteral"; value: number }
    | { type: "stringLiteral"; value: string }
    | { type: "booleanLiteral"; value: boolean };

export type ErrorType<T, Error = string> = Error | (T extends {} ? ErrorMap<T, Error> : never);
export type ErrorMap<T, Error = string> = {
    [Key in keyof T]?: ErrorType<T[Key], Error>;
};

export interface ValidationSettings {
    otherTypes?: Types;
    abortEarly?: boolean;
    maxStringLength?: number;
}

export function validate<T, Error extends string = string>(schema: TypeSchema, value: any, settings: ValidationSettings): ErrorType<T, Error> | null {
    switch (schema.type) {
        case "never":
        case "unknown":
            return "this value should not exist" as any;
        case "any":
            return null;
        case "number":
            if (typeof value !== "number") return "must be of type `number`" as any;
            if (schema.min && value < schema.min) return schema.minMessage ?? ("must be higher" as any);
            if (schema.max && value > schema.max) return schema.maxMessage ?? ("must be lower" as any);
            return null;
        case "string":
            if (typeof value !== "string") return "must be of type `string`" as any;
            if (schema.min && value.length < schema.min) return schema.minMessage ?? ("must be longer" as any);
            let max = schema.max ?? settings.maxStringLength;
            if (max && value.length > max) return schema.maxMessage ?? ("must be shorter" as any);
            if (schema.regex && value.match(schema.regex) === null) return schema.regexMessage ?? ("does not match regex" as any);
            return null;
        case "boolean":
        case "object":
        case "undefined":
            return typeof value === schema.type ? null : (`must be of type \`${schema.type}\`` as any);
        case "null":
            return value === null ? null : ("must be `null`" as any);
        case "ref":
            let sch = settings.otherTypes?.[schema.name];
            if (!sch) throw new Error(`Schema for type \`${schema.name}\` was not found.`);
            return validate(sch, value, settings);
        case "stringLiteral":
        case "booleanLiteral":
        case "numberLiteral":
            return value === schema.value ? null : (`must have value \`${schema.value}\`` as any);

        case "or": {
            let err: ErrorType<T, Error>[] = [];
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let res = validate<T, Error>(sch, value, settings);
                if (res === null) return null;
                err.push(res);
            }
            return err.join(", ") as any;
        }
        case "array": {
            if (!Array.isArray(value)) return "invalid array" as any;
            if (schema.min && value.length < schema.min) return schema.minMessage ?? ("array too short" as any);
            if (schema.max && value.length > schema.max) return schema.maxMessage ?? ("array too long" as any);
            let err: ErrorMap<T, Error> = {};
            for (let i = 0; i < value.length; i++) {
                let res = validate(schema.itemType, value[i], settings);
                if (res !== null) {
                    err[i as keyof T] = res as any;
                    if (settings.abortEarly) return err as any;
                }
            }
            return Object.keys(err).length > 0 ? (err as any) : null;
        }
        case "objectLiteral": {
            if (typeof value !== "object" || value === null) return "invalid object" as any;
            if (Object.keys(value).some((e) => !(e in schema.fields))) return "object contains unknown keys" as any;
            let err: ErrorMap<T, Error> = {};
            let keys = Object.keys(schema.fields);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let res = validate(schema.fields[key], value[key], settings);
                if (res !== null) {
                    err[key as keyof T] = res as any;
                    if (settings.abortEarly) return err as any;
                }
            }
            return Object.keys(err).length > 0 ? (err as any) : null;
        }
        case "tuple": {
            if (!Array.isArray(value) || value.length > schema.itemTypes.length) return "invalid tuple" as any;
            let err: ErrorMap<T, Error> = {};
            for (let i = 0; i < schema.itemTypes.length; i++) {
                let res = validate(schema.itemTypes[i], value[i], settings);
                if (res !== null) {
                    err[i as keyof T] = res as any;
                    if (settings.abortEarly) return err as any;
                }
            }
            return Object.keys(err).length > 0 ? (err as any) : null;
        }
        case "date": {
            if (value instanceof Date) return null;
            if (typeof value === "string" || typeof value === "number") {
                let date = new Date(value);
                return isNaN(date.getTime()) ? ("invalid date string" as any) : null;
            } else {
                return "invalid date format" as any;
            }
        }
    }
}

/* ---- Client-side ---- */

export class ValidationError extends Error {
    constructor(message: string, public errors: ErrorMap<any>) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class RateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export async function defaultFetcher(url: any, method: any, body: any) {
    let res = await fetch(url, {
        method,
        body: typeof body === "object" ? JSON.stringify(body) : null,
        headers: { "Content-Type": "application/json" },
    });

    if (res.status <= 400) {
        return await res.json();
    } else if (res.status === 406) {
        throw new ValidationError("Validation error", await res.json());
    } else if (res.status === 429) {
        throw new RateLimitError("Rate limited");
    } else if (res.status === 401) {
        throw new Error(`Unauthorized. To implement authorization, override fetcher in the client settings.`);
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

    public fetch<Path extends keyof Endpoints>(method: string, path: Path, body?: Endpoints[Path]["req"]): Promise<Endpoints[Path]["res"]> {
        return this.settings.fetcher!(this.settings.path! + (path as string), method, body);
    }
}
import { UserRoutes } from "./userRoutes"
import { Routes } from "./index"

const PATH_VALIDATORS: {
        [Key in keyof Endpoints]?: keyof typeof SCHEMAS;
    } = {"/routes":"RoutesRequest","/update/event":"UpdateEventRequest","/user/get":"UserGetRequest","/user/create":"UserCreateRequest"}

export type Endpoints = {
		"/routes": {
            req: UserRoutes.RoutesRequest,
            res: never,
        },
		"/update/event": {
            req: Routes.UpdateEventRequest,
            res: never,
        },
		"/user/list": {
            req: never,
            res: Routes.UserListResponse,
        },
		"/user/get": {
            req: Routes.UserGetRequest,
            res: Routes.UserGetResponse,
        },
		"/user/create": {
            req: Routes.UserCreateRequest,
            res: Routes.UserCreateResponse,
        },
}



export class Client extends BaseClient<Endpoints> {

        /**
         * Fetches "/routes" from the server. (`Routes`)
         */
        public async routes(data: UserRoutes.RoutesRequest): Promise<void> {
            await this.fetch("post", "/routes", data);
        }


            /**
             * Validates `UserRoutes.RoutesRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
             */
            public static validateRoutesRequest<Error extends string>(data: UserRoutes.RoutesRequest, settings: ValidationSettings = {}): ErrorType<UserRoutes.RoutesRequest, Error> | null {
                return validate(SCHEMAS.RoutesRequest, data, settings);
            }


        /**
         * Fetches "/update/event" from the server. (`UpdateEvent`)
         */
        public async updateEvent(data: Routes.UpdateEventRequest): Promise<void> {
            await this.fetch("post", "/update/event", data);
        }


            /**
             * Validates `Routes.UpdateEventRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
             */
            public static validateUpdateEventRequest<Error extends string>(data: Routes.UpdateEventRequest, settings: ValidationSettings = {}): ErrorType<Routes.UpdateEventRequest, Error> | null {
                return validate(SCHEMAS.UpdateEventRequest, data, settings);
            }


        /**
         * Fetches "/user/list" from the server. (`UserList`)
         */
        public async userList(): Promise<Routes.UserListResponse> {
            return await this.fetch("post", "/user/list");
        }


        /**
         * Fetches "/user/get" from the server. (`UserGet`)
         */
        public async userGet(data: Routes.UserGetRequest): Promise<Routes.UserGetResponse> {
            return await this.fetch("post", "/user/get", data);
        }


            /**
             * Validates `Routes.UserGetRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
             */
            public static validateUserGetRequest<Error extends string>(data: Routes.UserGetRequest, settings: ValidationSettings = {}): ErrorType<Routes.UserGetRequest, Error> | null {
                return validate(SCHEMAS.UserGetRequest, data, settings);
            }


        /**
         * Fetches "/user/create" from the server. (`UserCreate`)
         */
        public async userCreate(data: Routes.UserCreateRequest): Promise<Routes.UserCreateResponse> {
            return await this.fetch("post", "/user/create", data);
        }


            /**
             * Validates `Routes.UserCreateRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
             */
            public static validateUserCreateRequest<Error extends string>(data: Routes.UserCreateRequest, settings: ValidationSettings = {}): ErrorType<Routes.UserCreateRequest, Error> | null {
                return validate(SCHEMAS.UserCreateRequest, data, settings);
            }
}

const SCHEMAS = {
    "RoutesRequest": {
        "type": "objectLiteral",
        "fields": {
            "name": {
                "type": "string"
            }
        }
    },
    "UpdateEventRequest": {
        "type": "objectLiteral",
        "fields": {
            "event": {
                "type": "ref",
                "name": "Event"
            },
            "notifyUsers": {
                "type": "boolean"
            }
        }
    },
    "Event": {
        "type": "objectLiteral",
        "fields": {
            "id": {
                "type": "string"
            },
            "title": {
                "type": "string"
            },
            "description": {
                "type": "string"
            },
            "testId": {
                "type": "or",
                "schemas": [
                    {
                        "type": "undefined"
                    },
                    {
                        "type": "number"
                    }
                ]
            },
            "createdTimeStamp": {
                "type": "number"
            },
            "notifiedUsers": {
                "type": "boolean"
            }
        }
    },
    "UserGetRequest": {
        "type": "objectLiteral",
        "fields": {
            "userId": {
                "type": "number",
                "min": 100,
                "minMessage": "Must be larger than 100"
            }
        }
    },
    "UserCreateRequest": {
        "type": "objectLiteral",
        "fields": {
            "email": {
                "type": "string",
                "regex": "^\\S+@\\S+\\.\\S+",
                "regexMessage": "Invalid email"
            },
            "password": {
                "type": "string",
                "min": 1,
                "minMessage": "Password must be longer"
            },
            "birthDate": {
                "type": "date"
            },
            "gender": {
                "type": "or",
                "schemas": [
                    {
                        "type": "stringLiteral",
                        "value": "male"
                    },
                    {
                        "type": "stringLiteral",
                        "value": "female"
                    }
                ]
            }
        }
    }
} as const;
    