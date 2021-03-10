/* DO NOT MODIFY, THIS FILE WAS GENERATED */

import {
    RequestHandler,
    RequestHandlerParams,
} from "express-serve-static-core";

export type Endpoint<Req, Res, Params = never, Query = never> = {
    req: Req;
    res: Res;
    params: Params;
    query: Query;
};

export type MethodPath<Method> = keyof Endpoints[Method];

export type TypedParsedQs<T> = {
    [Key in keyof T]: undefined | string | string[] | ParsedQs<T[Key]>;
};

declare module "express-serve-static-core" {
    // 'get' has weird type
    export interface Application {
        get: IRouterMatcher<this, "get">;
    }

    export interface IRouterMatcher<
        T,
        Method extends
            | "all"
            | "get"
            | "post"
            | "put"
            | "delete"
            | "patch"
            | "options"
            | "head"
    > {
        <
            Locals extends Record<string, any> = Record<string, any>,
            Path extends MethodPath<Method>
        >(
            path: Path,
            // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
            ...handlers: Array<
                RequestHandler<
                    Endpoints[Method][Path]["params"],
                    Endpoints[Method][Path]["res"],
                    Endpoints[Method][Path]["req"],
                    TypedParsedQs<Endpoints[Method][Path]["query"]>,
                    Locals
                >
            >
        ): T;
        <
            Locals extends Record<string, any> = Record<string, any>,
            Path extends MethodPath<Method>
        >(
            path: MethodPath<Method>,
            // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
            ...handlers: Array<
                RequestHandlerParams<
                    Endpoints[Method][Path]["params"],
                    Endpoints[Method][Path]["res"],
                    Endpoints[Method][Path]["req"],
                    TypedParsedQs<Endpoints[Method][Path]["query"]>,
                    Locals
                >
            >
        ): T;
    }
}
import { Post, User, Gender, Validation, Routes, ValidationContext } from "./index"
import { CallTracker } from "assert"
export type Endpoints = {
	post: {
		"/post": Endpoint<Routes.PostPostRequest, Routes.PostPostRequest>;
	},
	get: {
		"/user": Endpoint<Routes.GetUserRequest, Routes.GetUserRequest>;
		"/user/post": Endpoint<Routes.GetUserPostRequest, unknown>;
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
        throw new Error(
            `Unauthorized. To implement authorization, override fetcher in the client settings.`
        );
    } else if (res.status === 404 || (res.status > 200 && res.status < 300)) {
        return null;
    } else {
        throw new Error(
            `Could not fetch '${method}' (HTTP ${res.status}: ${res.statusText})`
        );
    }
}

interface ClientSettings {
    path?: string;
    fetcher?: (url: string, method: string, body?: object) => Promise<any>;
}

class Client {
    public readonly settings: ClientSettings;

    public constructor(settings: ClientSettings = {}) {
        settings.path ||= "";
        settings.fetcher ||= module.exports.defaultFetcher;
        if (settings.path.endsWith("/"))
            settings.path = settings.path.substring(
                0,
                settings.path.length - 1
            );
        this.settings = settings;
    }

    public fetch<Method extends keyof Endpoints, Path extends MethodPath<Method>>(
        method: Method,
        path: Path,
        body?: Endpoints[Method][Path]["req"],
        query?: Endpoints[Method][Path]["query"]
    ): Promise<Endpoints[Method][Path]["res"]> {
        return this.settings.fetcher(path, method, body);
    }

    async postPost (data: Routes.PostPostRequest): Promise<Routes.PostPostResponse> {
                return await this.fetch("post", "/post", data);
            }

async getUser (data: Routes.GetUserRequest): Promise<Routes.GetUserResponse> {
                return await this.fetch("get", "/user", data);
            }

async getUserPost (data: Routes.GetUserPostRequest): Promise<Routes.void> {
                return await this.fetch("get", "/user/post", data);
            }
    
}
    