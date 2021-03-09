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
export type Endpoints = {
	post: {
		"/post": Endpoint<PostPostRequest, PostPostResponse, unknown, unknown>;
	},
	get: {
		"/user": Endpoint<GetUserRequest, GetUserResponse, unknown, unknown>;
		"/user/post": Endpoint<GetUserPostRequest, unknown, unknown, unknown>;
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
};
export type Gender = (typeof Gender)[keyof typeof Gender]
export interface GetUserPostRequest {
    id: number;
    text: string;
}

interface ClientSettings {
    path?: string;
    fetcher?: (url: string, method: string, body?: object) => Promise<any>;
}

class Client {
    public readonly settings: ClientSettings;

    constructor(settings?: ClientSettings);

    fetch<Method extends keyof Endpoints, Path extends MethodPath<Method>>(
        method: Method,
        path: Path,
        body?: Endpoints[Method][Path]["req"],
        query?: Endpoints[Method][Path]["query"]
    ): Promise<Endpoints[Method][Path]["res"]>;

    async postPost (data: PostPostRequest): Promise<PostPostResponse>;

async getUser (data: GetUserRequest): Promise<GetUserResponse>;

async getUserPost (data: GetUserPostRequest): Promise<void>;
}
    