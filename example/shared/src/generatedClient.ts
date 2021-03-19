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
        let validatorName = PATH_VALIDATORS[path];
        if (!validatorName) return next();
        let [e, v] = validate(SCHEMAS[validatorName], req.body, { abortEarly: true, otherTypes: SCHEMAS });
        if (e === null) {
            req.body = v;
            return next();
        } else {
            return res.status(406).json(e);
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
    defaultMaxStringLength?: number;
    unknownKeyMode?: "delete" | "error";
}

export function validate<T extends any, Error extends string = string>(
    schema: TypeSchema,
    value: T,
    settings: ValidationSettings
): [errors: ErrorType<T, Error> | null, sanitizedValue: T | undefined] {
    switch (schema.type) {
        case "never":
        case "unknown":
            return ["this value should not exist" as Error, undefined];
        case "any":
            return [null, value];
        case "number":
            if (typeof value !== "number") return ["must be of type `number`" as Error, undefined];
            if (schema.min && value < schema.min) return [(schema.minMessage ?? "must be higher") as Error, undefined];
            if (schema.max && value > schema.max) return [(schema.maxMessage ?? "must be lower") as Error, undefined];
            return [null, value];
        case "string":
            if (typeof value !== "string") return ["must be of type `string`" as Error, undefined];
            if (schema.min && value.length < schema.min) return [(schema.minMessage ?? "must be longer") as Error, undefined];
            let max = schema.max ?? settings.defaultMaxStringLength;
            if (max && value.length > max) return [(schema.maxMessage ?? "must be shorter") as Error, undefined];
            if (schema.regex && value.match(schema.regex) === null) return [(schema.regexMessage ?? "does not match regex") as Error, undefined];
            return [null, value];
        case "boolean":
        case "object":
        case "undefined":
            return typeof value === schema.type ? [null, value] : [`must be of type \`${schema.type}\`` as Error, undefined];
        case "null":
            return value === null ? [null, value] : ["must be `null`" as Error, undefined];
        case "ref":
            let sch = settings.otherTypes?.[schema.name];
            if (!sch) throw new Error(`Schema for type \`${schema.name}\` was not found.`);
            return validate(sch, value, settings);
        case "stringLiteral":
        case "booleanLiteral":
        case "numberLiteral":
            return value === schema.value ? [null, value] : [`must have value \`${schema.value}\`` as Error, undefined];
        case "or": {
            let err: ErrorType<T, Error>[] = [];
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let [r, v] = validate<T, Error>(sch, value, settings);
                if (r === null) return [r, v];
                err.push(r);
            }
            return [(err.join(", ") || "invalid or") as Error, undefined];
        }
        case "array": {
            if (!Array.isArray(value)) return ["invalid array" as Error, undefined];
            if (schema.min && value.length < schema.min) return [(schema.minMessage ?? "array too short") as Error, undefined];
            if (schema.max && value.length > schema.max) return [(schema.maxMessage ?? "array too long") as Error, undefined];
            let err: ErrorMap<T, Error> = {};
            let copy = new Array(value.length);
            for (let i = 0; i < value.length; i++) {
                let [res, val] = validate(schema.itemType, value[i], settings);
                copy[i] = val;
                if (res !== null) {
                    err[i as keyof T] = res as Error;
                    if (settings.abortEarly) return [err as any, undefined];
                }
            }
            return Object.keys(err).length > 0 ? [err as any, undefined] : [null, copy as any];
        }
        case "objectLiteral": {
            if (typeof value !== "object" || value === null) return ["invalid object" as Error, undefined];
            if (settings.unknownKeyMode === "error" && Object.keys(value as any).some((e) => !(e in schema.fields))) return ["object contains unknown keys" as Error, undefined];
            let err: ErrorMap<T, Error> = {};
            let keys = Object.keys(schema.fields);
            let copy: any = {};
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let [res, val] = validate(schema.fields[key], (value as any)[key], settings);
                copy[key] = val;
                if (res !== null) {
                    err[key as keyof T] = res as Error;
                    if (settings.abortEarly) return [err as any, undefined];
                }
            }
            return Object.keys(err).length > 0 ? [err as any, undefined] : [null, copy];
        }
        case "tuple": {
            if (!Array.isArray(value) || value.length > schema.itemTypes.length) return ["invalid tuple" as Error, undefined];
            let err: ErrorMap<T, Error> = {};
            let copy = new Array(value.length);
            for (let i = 0; i < schema.itemTypes.length; i++) {
                let [res, val] = validate(schema.itemTypes[i], value[i], settings);
                copy[i] = val;
                if (res !== null) {
                    err[i as keyof T] = res as Error;
                    if (settings.abortEarly) return [err as any, undefined];
                }
            }
            return Object.keys(err).length > 0 ? [err as any, undefined] : [null, copy as any];
        }
        case "date": {
            if (value instanceof Date) return [null, value];
            if (typeof value === "string" || typeof value === "number") {
                let date = new Date(value);
                return isNaN(date.getTime()) ? ["invalid date" as Error, undefined] : [null, date as T];
            } else {
                return ["invalid date" as Error, undefined];
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

export interface ClientSettings {
    path?: string;
}

export class BaseClient<Endpoints extends EndpointsConstraint> {
    public readonly settings: ClientSettings;

    public get version() {
        return VERSION;
    }

    public constructor(settings: ClientSettings = {}) {
        settings.path ||= "";
        if (settings.path.endsWith("/")) settings.path = settings.path.substring(0, settings.path.length - 1);
        this.settings = settings;
    }

    public async fetch<P extends keyof Endpoints>(method: string, url: P, body?: Endpoints[P]["req"]): Promise<Endpoints[P]["res"]> {
        let res = await fetch((this.settings.path! + url) as string, {
            method,
            body: typeof body === "object" ? JSON.stringify(body) : null,
            headers: { "Content-Type": "application/json" },
        });

        if (res.status <= 400) {
            let text = (await res.text()).trim();
            if (!text) return undefined as any;
            return JSON.parse(text);
        } else if (res.status === 406) {
            throw new ValidationError("Validation error", await res.json());
        } else if (res.status === 429) {
            throw new RateLimitError("Rate limited");
        } else if (res.status === 401) {
            throw new Error(`Unauthorized. To implement authorization and custom fetch logic, extend the Client class and override fetch.`);
        } else {
            throw new Error(`Could not fetch '${method}' (HTTP ${res.status}: ${res.statusText})`);
        }
    }
}
import { UserRoutes } from "./userRoutes"
import { Routes, Test, Yiesk } from "./index"

const PATH_VALIDATORS: {
        [Key in keyof Endpoints]?: keyof typeof SCHEMAS;
    } = {"/routes":"UserRoutes.RoutesRequest","/update/event":"Routes.UpdateEventRequest","/user/get":"Routes.UserGetRequest","/user/create":"Routes.UserCreateRequest"}

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



const VERSION = "1.0.13";

export class Client extends BaseClient<Endpoints> {
    

        /**
         * Fetches "/routes" from the server. (`Routes`)
         */
        public async routes(data: UserRoutes.RoutesRequest): Promise<void> {
            await this.fetch("post", "/routes", data);
        }


        /**
         * Fetches "/update/event" from the server. (`UpdateEvent`)
         */
        public async updateEvent(data: Routes.UpdateEventRequest): Promise<void> {
            await this.fetch("post", "/update/event", data);
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
         * Fetches "/user/create" from the server. (`UserCreate`)
         */
        public async userCreate(data: Routes.UserCreateRequest): Promise<Routes.UserCreateResponse> {
            return await this.fetch("post", "/user/create", data);
        }


        /**
         * Validates `UserRoutes.RoutesRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateUserRoutesRoutesRequest<Error extends string>(data: UserRoutes.RoutesRequest, settings?: ValidationSettings): ErrorType<UserRoutes.RoutesRequest, Error> | null {
            return validate<UserRoutes.RoutesRequest, Error>(SCHEMAS["UserRoutes.RoutesRequest"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Routes.UpdateEventRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateRoutesUpdateEventRequest<Error extends string>(data: Routes.UpdateEventRequest, settings?: ValidationSettings): ErrorType<Routes.UpdateEventRequest, Error> | null {
            return validate<Routes.UpdateEventRequest, Error>(SCHEMAS["Routes.UpdateEventRequest"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Omit<Test, "events">` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateOmitTestEvents<Error extends string>(data: Omit<Test, "events">, settings?: ValidationSettings): ErrorType<Omit<Test, "events">, Error> | null {
            return validate<Omit<Test, "events">, Error>(SCHEMAS["Omit<Test, \"events\">"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Routes.UserGetRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateRoutesUserGetRequest<Error extends string>(data: Routes.UserGetRequest, settings?: ValidationSettings): ErrorType<Routes.UserGetRequest, Error> | null {
            return validate<Routes.UserGetRequest, Error>(SCHEMAS["Routes.UserGetRequest"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Yiesk<number>` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateYieskNumber<Error extends string>(data: Yiesk<number>, settings?: ValidationSettings): ErrorType<Yiesk<number>, Error> | null {
            return validate<Yiesk<number>, Error>(SCHEMAS["Yiesk<number>"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Routes.UserCreateRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateRoutesUserCreateRequest<Error extends string>(data: Routes.UserCreateRequest, settings?: ValidationSettings): ErrorType<Routes.UserCreateRequest, Error> | null {
            return validate<Routes.UserCreateRequest, Error>(SCHEMAS["Routes.UserCreateRequest"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }
}

const SCHEMAS = {
    "UserRoutes.RoutesRequest": {
        "type": "objectLiteral",
        "fields": {
            "name": {
                "type": "string"
            }
        }
    },
    "Routes.UpdateEventRequest": {
        "type": "objectLiteral",
        "fields": {
            "test": {
                "type": "ref",
                "name": "Omit<Test, \"events\">"
            },
            "notifyUsers": {
                "type": "or",
                "schemas": [
                    {
                        "type": "undefined"
                    },
                    {
                        "type": "booleanLiteral",
                        "value": false
                    },
                    {
                        "type": "booleanLiteral",
                        "value": true
                    }
                ]
            }
        }
    },
    "Omit<Test, \"events\">": {
        "type": "objectLiteral",
        "fields": {
            "id": {
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
            "name": {
                "type": "string"
            },
            "duration": {
                "type": "number"
            },
            "reward": {
                "type": "number"
            },
            "description": {
                "type": "string"
            },
            "minAge": {
                "type": "number"
            },
            "maxAge": {
                "type": "number"
            },
            "language": {
                "type": "string"
            },
            "createdTimeStamp": {
                "type": "number"
            },
            "notifiedUsers": {
                "type": "boolean"
            }
        }
    },
    "Routes.UserGetRequest": {
        "type": "objectLiteral",
        "fields": {
            "userId": {
                "type": "number",
                "min": 0,
                "minMessage": "Must be larger than 0"
            },
            "data": {
                "type": "objectLiteral",
                "fields": {
                    "yes": {
                        "type": "boolean"
                    },
                    "date": {
                        "type": "date"
                    },
                    "val": {
                        "type": "ref",
                        "name": "Yiesk<number>"
                    }
                }
            }
        }
    },
    "Yiesk<number>": {
        "type": "objectLiteral",
        "fields": {
            "data": {
                "type": "number"
            }
        }
    },
    "Routes.UserCreateRequest": {
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
    