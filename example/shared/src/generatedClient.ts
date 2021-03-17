/* DO NOT MODIFY, THIS FILE WAS GENERATED */

import type c from "express-serve-static-core";
import type p from "qs";

export type ErrorType<T, Error = string> = Error | null | (T extends {} ? ErrorMap<T, Error> : never);

export type ErrorMap<T, Error = string> = {
    [Key in keyof T]?: ErrorType<NonNullable<T>, Error>;
};

export type Types = {
    [name: string]: TypeSchema;
};
export type TypeSchema =
    | { type: "or"; schemas: readonly TypeSchema[] }
    | { type: "ref"; name: string }
    | { type: "objectLiteral"; fields: Types }
    | { type: "array"; itemType: TypeSchema; min?: number; max?: number }
    | { type: "tuple"; itemTypes: readonly TypeSchema[] }
    | { type: "undefined" }
    | { type: "null" }
    | { type: "string"; min?: number; max?: number; regex?: string }
    | { type: "boolean" }
    | { type: "object" }
    | { type: "date" }
    | { type: "never" }
    | { type: "unknown" }
    | { type: "any" }
    | { type: "number"; min?: number; max?: number }
    | { type: "numberLiteral"; value: number }
    | { type: "stringLiteral"; value: string }
    | { type: "booleanLiteral"; value: boolean };

type EndpointsConstraint = {
    [path: string]: {
        req: any;
        res: any;
    };
};

interface ITypedRouter {
    typed: ITypedRouterPostMatcher<this>;
}

interface ITypedRouterPostMatcher<T> {
    <Path extends keyof U, P = c.ParamsDictionary, ReqQuery = p.ParsedQs, Locals extends Record<string, any> = Record<string, any>, U extends EndpointsConstraint = Endpoints>(
        path: Path,
        ...handlers: Array<c.RequestHandler<P, U[Path]["res"], U[Path]["req"], ReqQuery, Locals>>
    ): T;
    <Path extends keyof U, P = c.ParamsDictionary, ReqQuery = p.ParsedQs, Locals extends Record<string, any> = Record<string, any>, U extends EndpointsConstraint = Endpoints>(
        path: Path,
        ...handlers: Array<c.RequestHandlerParams<P, U[Path]["res"], U[Path]["req"], ReqQuery, Locals>>
    ): T;
}

export function typedRouter<T extends c.IRouter>(router: T): T & ITypedRouter {
    (router as any).typed = (path: keyof Endpoints, ...rest: any[]) => {
        router.post(
            path,
            (req, res, next) => {
                let val = PATH_VALIDATORS[path];
                if (!val) return next();
                let err = validate(SCHEMAS[val], req.body, { abortEarly: true });
                if (err === null) {
                    return next();
                } else {
                    // next(new Error("Invalid body"))
                    return res.status(400).json(err);
                }
            },
            ...rest
        );
    };
    return router as any;
}

// declare module "express-serve-static-core" {
//     export interface IRouterMatcher<T, Method extends "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head" = any> {
//         <Path extends keyof U, P = c.ParamsDictionary, ReqQuery = p.ParsedQs, Locals extends Record<string, any> = Record<string, any>, U extends EndpointsConstraint = Endpoints>(
//             path: Path,
//             // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
//             ...handlers: Array<c.RequestHandler<P, U[Path]["res"], U[Path]["req"], ReqQuery, Locals>>
//         ): T;
//         <Path extends keyof U, P = c.ParamsDictionary, ReqQuery = p.ParsedQs, Locals extends Record<string, any> = Record<string, any>, U extends EndpointsConstraint = Endpoints>(
//             path: Path,
//             // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
//             ...handlers: Array<c.RequestHandlerParams<P, U[Path]["res"], U[Path]["req"], ReqQuery, Locals>>
//         ): T;
//     }
// }

export interface ValidationSettings {
    otherTypes?: Types;
    abortEarly?: boolean;
    maxStringLength?: number;
}

export function validate<T, Error extends string = string>(schema: TypeSchema, value: any, settings: ValidationSettings): ErrorType<T, Error> {
    switch (schema.type) {
        case "never":
        case "unknown":
            return "this value should not exist" as Error;
        case "any":
            return null;
        case "number":
            if (typeof value !== "number") return "must be of type `number`" as Error;
            if (schema.min && value < schema.min) return "must be higher" as Error;
            if (schema.max && value > schema.max) return "must be lower" as Error;
            return null;
        case "string":
            if (typeof value !== "string") return "must be of type `string`" as Error;
            if (schema.min && value.length < schema.min) return "must be longer" as Error;
            let max = schema.max ?? settings.maxStringLength;
            if (max && value.length > max) return "must be shorter" as Error;
            if (schema.regex && value.match(schema.regex) === null) return "does not match regex" as Error;
            return null;
        case "boolean":
        case "object":
        case "undefined":
            return typeof value === schema.type ? null : (`must be of type \`${schema.type}\`` as Error);
        case "null":
            return value === null ? null : ("must be `null`" as Error);
        case "ref":
            let sch = settings.otherTypes?.[schema.name];
            if (!sch) throw new Error(`Schema for type \`${schema.name}\` was not found.`);
            return validate(sch, value, settings);
        case "stringLiteral":
        case "booleanLiteral":
        case "numberLiteral":
            return value === schema.value ? null : (`must have value \`${schema.value}\`` as Error);

        case "or": {
            let err: ErrorType<T, Error>[] = [];
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let res = validate<T, Error>(sch, value, settings);
                if (res === null) return null;
                err.push(res);
            }
            return err.join(", ") as Error;
        }
        case "array": {
            if (!Array.isArray(value)) return "invalid array" as Error;
            if (schema.min && value.length < schema.min) return "array too short" as Error;
            if (schema.max && value.length > schema.max) return "array too long" as Error;
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
            if (typeof value !== "object" || value === null) return "invalid object" as Error;
            if (Object.keys(value).some((e) => !(e in schema.fields))) return "object contains unknown keys" as Error;
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
            if (!Array.isArray(value) || value.length > schema.itemTypes.length) return "invalid tuple" as Error;
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
                return isNaN(date.getTime()) ? ("invalid date string" as Error) : null;
            } else {
                return "invalid date format" as Error;
            }
        }
    }
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

    public fetch<Path extends keyof Endpoints>(method: string, path: Path, body?: Endpoints[Path]["req"]): Promise<Endpoints[Path]["res"]> {
        return this.settings.fetcher!(this.settings.path! + (path as string), method, body);
    }
}
import { UserRoutes } from "./userRoutes"
import { Routes } from "./index"

const PATH_VALIDATORS: {
        [Key in keyof Endpoints]?: keyof typeof SCHEMAS;
    } = {"/routes":"RoutesRequest","/user/get":"UserGetRequest","/user/create":"UserCreateRequest","/post/create":"PostCreateRequest","/user/post/list":"UserPostListRequest"}

export type Endpoints = {
		"/routes": {
            req: UserRoutes.RoutesRequest,
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
		"/post/create": {
            req: Routes.PostCreateRequest,
            res: Routes.PostCreateResponse,
        },
		"/user/post/list": {
            req: Routes.UserPostListRequest,
            res: Routes.UserPostListResponse,
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


        /**
         * Fetches "/post/create" from the server. (`PostCreate`)
         */
        public async postCreate(data: Routes.PostCreateRequest): Promise<Routes.PostCreateResponse> {
            return await this.fetch("post", "/post/create", data);
        }


            /**
             * Validates `Routes.PostCreateRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
             */
            public static validatePostCreateRequest<Error extends string>(data: Routes.PostCreateRequest, settings: ValidationSettings = {}): ErrorType<Routes.PostCreateRequest, Error> | null {
                return validate(SCHEMAS.PostCreateRequest, data, settings);
            }


        /**
         * Fetches "/user/post/list" from the server. (`UserPostList`)
         */
        public async userPostList(data: Routes.UserPostListRequest): Promise<Routes.UserPostListResponse> {
            return await this.fetch("post", "/user/post/list", data);
        }


            /**
             * Validates `Routes.UserPostListRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
             */
            public static validateUserPostListRequest<Error extends string>(data: Routes.UserPostListRequest, settings: ValidationSettings = {}): ErrorType<Routes.UserPostListRequest, Error> | null {
                return validate(SCHEMAS.UserPostListRequest, data, settings);
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
    "UserGetRequest": {
        "type": "objectLiteral",
        "fields": {
            "userId": {
                "type": "number"
            }
        }
    },
    "UserCreateRequest": {
        "type": "objectLiteral",
        "fields": {
            "email": {
                "type": "string",
                "regex": "^\\S+@\\S+\\.\\S+$"
            },
            "password": {
                "type": "string",
                "min": 5
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
    },
    "PostCreateRequest": {
        "type": "objectLiteral",
        "fields": {
            "title": {
                "type": "string"
            },
            "content": {
                "type": "string"
            }
        }
    },
    "UserPostListRequest": {
        "type": "objectLiteral",
        "fields": {
            "userId": {
                "type": "number"
            }
        }
    }
} as const;
    