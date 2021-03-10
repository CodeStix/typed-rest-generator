/* DO NOT MODIFY, THIS FILE WAS GENERATED */

import type { RequestHandler, RequestHandlerParams, ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";

// // Testing purposes
// export type Endpoints = {
//     post: {
//         "/user": {
//             req: GetUserRequest;
//             res: GetUserResponse;
//         };
//     };
//     get: {};
//     put: {};
//     delete: {};
//     patch: {};
//     options: {};
//     head: {};
//     all: {};
// };
// interface GetUserRequest {
//     userId: number;
// }
// interface GetUserResponse {
//     user: object;
// }

// This was needed apparently
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
            P = ParamsDictionary,
            ReqQuery = ParsedQs,
            Locals extends Record<string, any> = Record<string, any>,
            U extends EndpointsConstraint = Endpoints
        >(
            path: Path,
            // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
            ...handlers: Array<RequestHandler<P, U[Method][Path]["req"], U[Method][Path]["res"], ReqQuery, Locals>>
        ): T;
        <
            Path extends keyof U[Method],
            P = ParamsDictionary,
            ReqQuery = ParsedQs,
            Locals extends Record<string, any> = Record<string, any>,
            U extends EndpointsConstraint = Endpoints
        >(
            path: Path,
            // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
            ...handlers: Array<RequestHandlerParams<P, U[Method][Path]["req"], U[Method][Path]["res"], ReqQuery, Locals>>
        ): T;
    }
}
import { Post, User, Gender, Validation, Routes, ValidationContext } from "./src/index"
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

interface ClientSettings {
    path?: string;
    fetcher?: (url: string, method: string, body?: object) => Promise<any>;
}

class BaseClient<Endpoints extends EndpointsConstraint> {
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

class Client extends BaseClient<Endpoints> {
async postPost (data: Routes.PostPostRequest): Promise<Routes.PostPostResponse> {
                return await this.fetch("post", "/post", data);
            }

async getUser (data: Routes.GetUserRequest): Promise<Routes.GetUserResponse> {
                return await this.fetch("get", "/user", data);
            }

async getUserPost (data: Routes.GetUserPostRequest): Promise<void> {
                await this.fetch("get", "/user/post", data);
            }

}

    