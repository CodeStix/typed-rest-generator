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
export type NumberTypeSchema = { type: "number"; min?: number; max?: number; minMessage?: string; maxMessage?: string; integer?: boolean; integerMessage?: string };
export type StringTypeSchema = { type: "string"; min?: number; max?: number; regex?: string; minMessage?: string; maxMessage?: string; regexMessage?: string };
export type ArrayTypeSchema = { type: "array"; itemType: TypeSchema; min?: number; max?: number; minMessage?: string; maxMessage?: string };
export type TypeRefSchema = { type: "ref"; name: string };
export type TypeSchema =
    | { type: "or"; schemas: readonly TypeSchema[] }
    | TypeRefSchema
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
    defaultNumberMode?: "integer" | "float";
}

export function validate<T extends any, Error extends string = string>(
    schema: TypeSchema,
    value: T,
    settings: ValidationSettings
): [errors: ErrorMap<T, Error> | null, sanitizedValue: T | undefined] {
    switch (schema.type) {
        case "never":
        case "unknown":
            return ["this value should not exist" as any, undefined];
        case "any":
            return [null, value];
        case "number":
            if (typeof value !== "number" || isNaN(value)) return ["must be of type `number`" as any, undefined];
            if (schema.min && value < schema.min) return [(schema.minMessage ?? "must be higher") as any, undefined];
            if (schema.max && value > schema.max) return [(schema.maxMessage ?? "must be lower") as any, undefined];
            if (!Number.isInteger(value) && (schema.integer ?? (!settings.defaultNumberMode || settings.defaultNumberMode === "integer")))
                return [schema.integerMessage ?? ("must be integer" as any), undefined];
            return [null, value];
        case "string":
            if (typeof value !== "string") return ["must be of type `string`" as any, undefined];
            if (schema.min && value.length < schema.min) return [(schema.minMessage ?? "must be longer") as any, undefined];
            let max = schema.max ?? settings.defaultMaxStringLength;
            if (max && value.length > max) return [(schema.maxMessage ?? "must be shorter") as any, undefined];
            if (schema.regex && value.match(schema.regex) === null) return [(schema.regexMessage ?? "does not match regex") as any, undefined];
            return [null, value];
        case "boolean":
        case "object":
        case "undefined":
            return typeof value === schema.type ? [null, value] : [`must be of type \`${schema.type}\`` as any, undefined];
        case "null":
            return value === null ? [null, value] : ["must be `null`" as any, undefined];
        case "ref":
            let sch = settings.otherTypes?.[schema.name];
            if (!sch) throw new Error(`Schema for type \`${schema.name}\` was not found.`);
            return validate(sch, value, settings);
        case "stringLiteral":
        case "booleanLiteral":
        case "numberLiteral":
            return value === schema.value ? [null, value] : [`must have value \`${schema.value}\`` as any, undefined];
        case "or": {
            let err = [];
            for (let i = 0; i < schema.schemas.length; i++) {
                let sch = schema.schemas[i];
                let [r, v] = validate<T, Error>(sch, value, settings);
                if (r === null) return [r, v];
                err.push(r);
            }
            let objError = err.find((e) => typeof e === "object");
            if (objError) return [objError as any, undefined];
            return [err[err.length - 1] || ("invalid or" as any), undefined];
        }
        case "array": {
            if (!Array.isArray(value)) return ["invalid array" as any, undefined];
            if (schema.min && value.length < schema.min) return [(schema.minMessage ?? "array too short") as any, undefined];
            if (schema.max && value.length > schema.max) return [(schema.maxMessage ?? "array too long") as any, undefined];
            let err: any = {};
            let copy = new Array(value.length);
            for (let i = 0; i < value.length; i++) {
                let [res, val] = validate(schema.itemType, value[i], settings);
                copy[i] = val;
                if (res !== null) {
                    err[i as keyof T] = res as any;
                    if (settings.abortEarly ?? true) return [err as any, undefined];
                }
            }
            return Object.keys(err).length > 0 ? [err as any, undefined] : [null, copy as any];
        }
        case "objectLiteral": {
            if (typeof value !== "object" || value === null) return ["invalid object" as any, undefined];
            if (settings.unknownKeyMode === "error" && Object.keys(value as any).some((e) => !(e in schema.fields))) return ["object contains unknown keys" as any, undefined];
            let err: any = {};
            let keys = Object.keys(schema.fields);
            let copy: any = {};
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let [res, val] = validate(schema.fields[key], (value as any)[key], settings);
                copy[key] = val;
                if (res !== null) {
                    err[key as keyof T] = res as any;
                    if (settings.abortEarly ?? true) return [err as any, undefined];
                }
            }
            return Object.keys(err).length > 0 ? [err as any, undefined] : [null, copy];
        }
        case "tuple": {
            if (!Array.isArray(value) || value.length > schema.itemTypes.length) return ["invalid tuple" as any, undefined];
            let err: any = {};
            let copy = new Array(value.length);
            for (let i = 0; i < schema.itemTypes.length; i++) {
                let [res, val] = validate(schema.itemTypes[i], value[i], settings);
                copy[i] = val;
                if (res !== null) {
                    err[i as keyof T] = res as any;
                    if (settings.abortEarly ?? true) return [err as any, undefined];
                }
            }
            return Object.keys(err).length > 0 ? [err as any, undefined] : [null, copy as any];
        }
        case "date": {
            if (value instanceof Date) return [null, value];
            if (typeof value === "string" || typeof value === "number") {
                let date = new Date(value);
                return isNaN(date.getTime()) ? ["invalid date" as any, undefined] : [null, date as T];
            } else {
                return ["invalid date" as any, undefined];
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
import { Routes, Test, Question, MultipleAnswerValue, OpenAnswerValue, NumberAnswerValue, LocationAnswerValue, MultipleTableAnswerValue } from "./index"

const PATH_VALIDATORS: {
        [Key in keyof Endpoints]?: keyof typeof SCHEMAS;
    } = {"/routes":"0","/update/event":"1","/question/answer":"3","/user/get":"10","/user/create":"11"}

export type Endpoints = {
		"/routes": {
            req: UserRoutes.RoutesRequest,
            res: never,
        },
		"/update/event": {
            req: Routes.UpdateEventRequest,
            res: never,
        },
		"/question/answer": {
            req: Routes.QuestionAnswerRequest,
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



const VERSION = "1.1.7";

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
         * Fetches "/question/answer" from the server. (`QuestionAnswer`)
         */
        public async questionAnswer(data: Routes.QuestionAnswerRequest): Promise<void> {
            await this.fetch("post", "/question/answer", data);
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
         * Validates `UserRoutes.RoutesRequest` using the generated validator.
         */
        public static validateUserRoutesRoutesRequest<Error extends string>(data: UserRoutes.RoutesRequest, settings?: ValidationSettings): ErrorMap<UserRoutes.RoutesRequest, Error> | null {
            return validate<UserRoutes.RoutesRequest, Error>(SCHEMAS["0"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Routes.UpdateEventRequest` using the generated validator.
         */
        public static validateRoutesUpdateEventRequest<Error extends string>(data: Routes.UpdateEventRequest, settings?: ValidationSettings): ErrorMap<Routes.UpdateEventRequest, Error> | null {
            return validate<Routes.UpdateEventRequest, Error>(SCHEMAS["1"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Omit<Test, "events">` using the generated validator.
         */
        public static validateOmitTestEvents<Error extends string>(data: Omit<Test, "events">, settings?: ValidationSettings): ErrorMap<Omit<Test, "events">, Error> | null {
            return validate<Omit<Test, "events">, Error>(SCHEMAS["2"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Routes.QuestionAnswerRequest` using the generated validator.
         */
        public static validateRoutesQuestionAnswerRequest<Error extends string>(data: Routes.QuestionAnswerRequest, settings?: ValidationSettings): ErrorMap<Routes.QuestionAnswerRequest, Error> | null {
            return validate<Routes.QuestionAnswerRequest, Error>(SCHEMAS["3"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Question<MultipleAnswerValue | OpenAnswerValue | NumberAnswerValue | LocationAnswerValue | MultipleTableAnswerValue>` using the generated validator.
         */
        public static validateQuestionMultipleAnswerValueOpenAnswerValueNumberAnswerValueLocationAnswerValueMultipleTableAnswerValue<Error extends string>(data: Question<MultipleAnswerValue | OpenAnswerValue | NumberAnswerValue | LocationAnswerValue | MultipleTableAnswerValue>, settings?: ValidationSettings): ErrorMap<Question<MultipleAnswerValue | OpenAnswerValue | NumberAnswerValue | LocationAnswerValue | MultipleTableAnswerValue>, Error> | null {
            return validate<Question<MultipleAnswerValue | OpenAnswerValue | NumberAnswerValue | LocationAnswerValue | MultipleTableAnswerValue>, Error>(SCHEMAS["4"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `MultipleAnswerValue` using the generated validator.
         */
        public static validateMultipleAnswerValue<Error extends string>(data: MultipleAnswerValue, settings?: ValidationSettings): ErrorMap<MultipleAnswerValue, Error> | null {
            return validate<MultipleAnswerValue, Error>(SCHEMAS["5"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `OpenAnswerValue` using the generated validator.
         */
        public static validateOpenAnswerValue<Error extends string>(data: OpenAnswerValue, settings?: ValidationSettings): ErrorMap<OpenAnswerValue, Error> | null {
            return validate<OpenAnswerValue, Error>(SCHEMAS["6"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `NumberAnswerValue` using the generated validator.
         */
        public static validateNumberAnswerValue<Error extends string>(data: NumberAnswerValue, settings?: ValidationSettings): ErrorMap<NumberAnswerValue, Error> | null {
            return validate<NumberAnswerValue, Error>(SCHEMAS["7"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `LocationAnswerValue` using the generated validator.
         */
        public static validateLocationAnswerValue<Error extends string>(data: LocationAnswerValue, settings?: ValidationSettings): ErrorMap<LocationAnswerValue, Error> | null {
            return validate<LocationAnswerValue, Error>(SCHEMAS["8"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `MultipleTableAnswerValue` using the generated validator.
         */
        public static validateMultipleTableAnswerValue<Error extends string>(data: MultipleTableAnswerValue, settings?: ValidationSettings): ErrorMap<MultipleTableAnswerValue, Error> | null {
            return validate<MultipleTableAnswerValue, Error>(SCHEMAS["9"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Routes.UserGetRequest` using the generated validator.
         */
        public static validateRoutesUserGetRequest<Error extends string>(data: Routes.UserGetRequest, settings?: ValidationSettings): ErrorMap<Routes.UserGetRequest, Error> | null {
            return validate<Routes.UserGetRequest, Error>(SCHEMAS["10"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }


        /**
         * Validates `Routes.UserCreateRequest` using the generated validator.
         */
        public static validateRoutesUserCreateRequest<Error extends string>(data: Routes.UserCreateRequest, settings?: ValidationSettings): ErrorMap<Routes.UserCreateRequest, Error> | null {
            return validate<Routes.UserCreateRequest, Error>(SCHEMAS["11"], data, { otherTypes: SCHEMAS, ...settings })[0];
        }
}

const SCHEMAS = {
    "0": {
        "type": "objectLiteral",
        "fields": {
            "name": {
                "type": "string"
            }
        }
    },
    "1": {
        "type": "objectLiteral",
        "fields": {
            "test": {
                "type": "ref",
                "name": "2"
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
    "2": {
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
    "3": {
        "type": "objectLiteral",
        "fields": {
            "answer": {
                "type": "ref",
                "name": "4"
            }
        }
    },
    "4": {
        "type": "objectLiteral",
        "fields": {
            "name": {
                "type": "string"
            },
            "answer": {
                "type": "or",
                "schemas": [
                    {
                        "type": "ref",
                        "name": "5"
                    },
                    {
                        "type": "ref",
                        "name": "6"
                    },
                    {
                        "type": "ref",
                        "name": "7"
                    },
                    {
                        "type": "ref",
                        "name": "8"
                    },
                    {
                        "type": "ref",
                        "name": "9"
                    }
                ]
            }
        }
    },
    "5": {
        "type": "objectLiteral",
        "fields": {
            "selected": {
                "type": "array",
                "itemType": {
                    "type": "string",
                    "max": 1000
                }
            },
            "other": {
                "type": "or",
                "schemas": [
                    {
                        "type": "undefined"
                    },
                    {
                        "type": "string",
                        "max": 1000
                    }
                ]
            }
        }
    },
    "6": {
        "type": "objectLiteral",
        "fields": {
            "value": {
                "type": "string",
                "max": 1000
            }
        }
    },
    "7": {
        "type": "objectLiteral",
        "fields": {
            "value": {
                "type": "number"
            }
        }
    },
    "8": {
        "type": "objectLiteral",
        "fields": {
            "address": {
                "type": "never"
            }
        }
    },
    "9": {
        "type": "objectLiteral",
        "fields": {
            "selected": {
                "type": "array",
                "itemType": {
                    "type": "array",
                    "itemType": {
                        "type": "string",
                        "max": 100
                    }
                }
            }
        }
    },
    "10": {
        "type": "objectLiteral",
        "fields": {
            "userId": {
                "type": "number",
                "min": 0,
                "minMessage": "Must be larger than 0",
                "integer": false,
                "typeMessage": "Must be number"
            }
        }
    },
    "11": {
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
    