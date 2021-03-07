import express from "express";
import core from "express-serve-static-core";

type GetPost = {
  id: string;
};

interface Post {
  id: string;
  title: string;
  content: string;
}

interface GetPostResponse {
  post: Post;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

type GetUser = {
  id: number;
};

// type GetUserQuery = {};

type GetUserParams = {
  path: string;
};

type GetUserResponse = {
  user: User;
};

////////////////

type Endpoint<Req, Res, Params = any> = {
  req: Req;
  res: Res;
  params: Params;
};

export type Endpoints = {
  get: {
    "/postget": Endpoint<GetPost, GetPostResponse>;
  };
  post: {
    "/user": Endpoint<GetUser, GetUserResponse>;
  };
  put: {
    "/post": Endpoint<GetPost, GetPostResponse>;
  };
  delete: {};
  patch: {};
  options: {};
  head: {};
};

export type MethodPath<Method> = keyof Endpoints[Method];

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
      | "head" = any
  > {
    <
      P = ParamsDictionary,
      ReqQuery = ParsedQs,
      Locals extends Record<string, any> = Record<string, any>,
      Path extends MethodPath<Method>
    >(
      path: Path,
      // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
      ...handlers: Array<
        RequestHandler<
          P,
          Endpoints[Method][Path]["res"],
          Endpoints[Method][Path]["req"],
          ReqQuery,
          Locals
        >
      >
    ): T;
    <
      P = ParamsDictionary,
      ResBody = any,
      ReqBody = any,
      ReqQuery = ParsedQs,
      Locals extends Record<string, any> = Record<string, any>,
      Path extends MethodPath<Method>
    >(
      path: Path,
      // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
      ...handlers: Array<
        RequestHandlerParams<
          P,
          Endpoints[Method][Path]["res"],
          Endpoints[Method][Path]["req"],
          ReqQuery,
          Locals
        >
      >
    ): T;
  }
}
