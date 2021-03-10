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
export namespace Routes {
export type Endpoints = {
	post: {
		"/post": Endpoint<PostPostRequest, PostPostResponse>;
	},
	get: {
		"/user": Endpoint<GetUserRequest, GetUserResponse>;
		"/user/post": Endpoint<GetUserPostRequest, unknown>;
	},
}

export type PostPostRequest = {
        id: string;
    };
export interface PostPostResponse {
        post: Post;
    }
export type Post = {
  id: string
  title: string
  content: string
  userId: number
}
export interface GetUserRequest {
        id: number;
    }
export interface GetUserResponse {
        user: User;
    }
export type User = {
  id: number
  email: string
  password: string
  birthDate: Date
  gender: Gender
}
export const Gender: {
  male: 'male',
  female: 'female'
}
export type Gender = (typeof Gender)[keyof typeof Gender]
export interface GetUserPostRequest {
        id: number;
        text: string;
    }
}

interface ValidationContext {
    currentUser: User;
}
export type User = {
  id: number
  email: string
  password: string
  birthDate: Date
  gender: Gender
}
export const Gender: {
  male: 'male',
  female: 'female'
}
export type Gender = (typeof Gender)[keyof typeof Gender]


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

    async postPost (data: PostPostRequest): Promise<PostPostResponse> {
                return await this.fetch("post", "/post", data);
            }

async getUser (data: GetUserRequest): Promise<GetUserResponse> {
                return await this.fetch("get", "/user", data);
            }

async getUserPost (data: GetUserPostRequest): Promise<void> {
                return await this.fetch("get", "/user/post", data);
            }
    public static validatePost(data: export type Post = {
  id: string
  title: string
  content: string
  userId: number
}): ErrorMap<export type Post = {
  id: string
  title: string
  content: string
  userId: number
}> {


}


public static validateUser(data: export type User = {
  id: number
  email: string
  password: string
  birthDate: Date
  gender: Gender
}): ErrorMap<export type User = {
  id: number
  email: string
  password: string
  birthDate: Date
  gender: Gender
}> {


}


public static validateGender(data: export type Gender = (typeof Gender)[keyof typeof Gender]): ErrorMap<export type Gender = (typeof Gender)[keyof typeof Gender]> {


}


public static validatePostPostRequest(data: Routes.PostPostRequest): ErrorMap<Routes.PostPostRequest> {


function validatePostPostRequest(data: Routes.PostPostRequest, context: ValidationContext) {}

}


public static validatePostPostResponse(data: Routes.PostPostResponse): ErrorMap<Routes.PostPostResponse> {


function validatePostPostResponse(data: Routes.PostPostResponse, context: ValidationContext) {}

}


public static validateGetUserRequest(data: Routes.GetUserRequest): ErrorMap<Routes.GetUserRequest> {


function validateGetUserRequest(data: Routes.GetUserRequest, context: ValidationContext) {}

}


public static validateGetUserResponse(data: Routes.GetUserResponse): ErrorMap<Routes.GetUserResponse> {


function validateGetUserResponse(data: Routes.GetUserResponse, context: ValidationContext) {}

}


public static validateGetUserPostRequest(data: Routes.GetUserPostRequest): ErrorMap<Routes.GetUserPostRequest> {


function validateGetUserPostRequest(data: Routes.GetUserPostRequest, context: ValidationContext) {}

}


public static validateValidationContext(data: ValidationContext): ErrorMap<ValidationContext> {


function validateContext(data: ValidationContext) {}

}

}
    