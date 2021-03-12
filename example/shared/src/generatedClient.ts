/* DO NOT MODIFY, THIS FILE WAS GENERATED */

import type c from "express-serve-static-core";
import type p from "qs";

export type ErrorType<T, Error extends string = string> = NonNullable<T> extends object ? ErrorMap<NonNullable<T>, Error> : Error;

export type ErrorMap<T, Error extends string = string> = {
    [Key in keyof T]?: ErrorType<T[Key], Error>;
};

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
                let err = validate(SCHEMAS[val], req.body, {}, { abortEarly: true, strictObjects: true });
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

type TypeSchema =
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

interface ValidationSettings {
    abortEarly?: boolean;
    strictObjects?: boolean;
}

// Not exposed because will change in future
function validate<T, Context, Error extends string = string>(schema: TypeSchema, value: T, context: Context, settings: ValidationSettings): ErrorType<T, Error> | null {
    switch (schema.type) {
        case "isType":
            return typeof value === schema.value ? null : (`must be of type ${schema.value}` as any);
        case "isValue":
            return value === schema.value ? null : (`must have value ${JSON.stringify(schema.value)}` as any);
        case "isObject": {
            if (typeof value !== "object" || !value) return "invalid object" as any;
            let keys = Object.keys(schema.schema);
            if ((settings.strictObjects ?? true) && Object.keys(value).some((e) => !keys.includes(e))) return "object contains unknown keys" as any;
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
            if (!Array.isArray(value)) return "invalid array" as any;
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
            if (!Array.isArray(value)) return "invalid tuple" as any;
            if (value.length !== schema.itemSchemas.length) return "invalid tuple length" as any;
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
            let lastError: ErrorType<T, Error> | null = "invalid or" as any;
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
                if (res) return res as any;
            }
            return null;
        }
        case "true":
            return null;
        case "false":
            return "this value should not exist" as any;
        case "function":
            let fn = (CUSTOM_VALIDATORS as any)[schema.name];
            if (!fn) throw new Error(`Custom validator '${schema.name}' not found`);
            return fn(value, context, settings);
        case "ref":
            let sch = (SCHEMAS as any)[schema.value];
            if (!sch) throw new Error(`Could not find validator for type '${schema.value}'`);
            return validate((SCHEMAS as any)[schema.value], value, context, settings);
        case "unknown":
            throw new Error("Cannot validate unknown type.");
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
import { Routes, Validation } from "./index"
import { UserWithoutId, Gender } from "./generatedPrisma"

const PATH_VALIDATORS: {
        [Key in keyof Endpoints]?: keyof typeof SCHEMAS;
    } = {
	"/user/get": "RoutesUserGetRequest",
	"/user/create": "RoutesUserCreateRequest",
	"/post/create": "RoutesPostCreateRequest",
	"/user/post/list": "RoutesUserPostListRequest",
}

export type Endpoints = {
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
         * Fetches "/post/create" from the server. (`PostCreate`)
         */
        public async postCreate(data: Routes.PostCreateRequest): Promise<Routes.PostCreateResponse> {
            return await this.fetch("post", "/post/create", data);
        }


        /**
         * Fetches "/user/post/list" from the server. (`UserPostList`)
         */
        public async userPostList(data: Routes.UserPostListRequest): Promise<Routes.UserPostListResponse> {
            return await this.fetch("post", "/user/post/list", data);
        }


        /**
         * Validates `Routes.UserGetRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateRoutesUserGetRequest<Error extends string>(data: Routes.UserGetRequest, context?: any, settings: ValidationSettings = {}): ErrorType<Routes.UserGetRequest, Error> | null {
            return validate(SCHEMAS.RoutesUserGetRequest, data, context, settings);
        }


        /**
         * Validates `Routes.UserCreateRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateRoutesUserCreateRequest<Error extends string>(data: Routes.UserCreateRequest, context?: any, settings: ValidationSettings = {}): ErrorType<Routes.UserCreateRequest, Error> | null {
            return validate(SCHEMAS.RoutesUserCreateRequest, data, context, settings);
        }


        /**
         * Validates `UserWithoutId` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateUserWithoutId<Error extends string>(data: UserWithoutId, context?: any, settings: ValidationSettings = {}): ErrorType<UserWithoutId, Error> | null {
            return validate(SCHEMAS.UserWithoutId, data, context, settings);
        }


        /**
         * Validates `Routes.PostCreateRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateRoutesPostCreateRequest<Error extends string>(data: Routes.PostCreateRequest, context?: any, settings: ValidationSettings = {}): ErrorType<Routes.PostCreateRequest, Error> | null {
            return validate(SCHEMAS.RoutesPostCreateRequest, data, context, settings);
        }


        /**
         * Validates `Routes.UserPostListRequest` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateRoutesUserPostListRequest<Error extends string>(data: Routes.UserPostListRequest, context?: any, settings: ValidationSettings = {}): ErrorType<Routes.UserPostListRequest, Error> | null {
            return validate(SCHEMAS.RoutesUserPostListRequest, data, context, settings);
        }


        /**
         * Validates `Date` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateDate<Error extends string>(data: Date, context?: any, settings: ValidationSettings = {}): ErrorType<Date, Error> | null {
            return validate(SCHEMAS.Date, data, context, settings);
        }


        /**
         * Validates `Gender` using the generated and custom validators. Generated validators only check types, custom validators should check things like string lengths.
         */
        public static validateGender<Error extends string>(data: Gender, context?: any, settings: ValidationSettings = {}): ErrorType<Gender, Error> | null {
            return validate(SCHEMAS.Gender, data, context, settings);
        }
}

const SCHEMAS = {
    "RoutesUserGetRequest": {
        "type": "isObject",
        "schema": {
            "userId": {
                "type": "isType",
                "value": "number"
            }
        }
    },
    "RoutesUserCreateRequest": {
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
        "type": "and",
        "schemas": [
            {
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
            {
                "type": "function",
                "name": "Validation.validateUserWithoutId"
            }
        ]
    },
    "RoutesPostCreateRequest": {
        "type": "isObject",
        "schema": {
            "title": {
                "type": "isType",
                "value": "string"
            },
            "content": {
                "type": "isType",
                "value": "string"
            }
        }
    },
    "RoutesUserPostListRequest": {
        "type": "isObject",
        "schema": {
            "userId": {
                "type": "isType",
                "value": "number"
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

const CUSTOM_VALIDATORS = {
	"Validation.validatePostPostRequest": Validation.validatePostPostRequest,
	"Validation.validateUserWithoutId": Validation.validateUserWithoutId,
	"Validation.validateDate": Validation.validateDate,
	"Validation.validateGender": Validation.validateGender
}
    