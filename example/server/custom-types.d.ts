import core, {
  ParamsDictionary,
  RequestHandlerParams,
  RequestHandler,
} from "express-serve-static-core";
import { ParsedQs } from "qs";
import * as api from "../shared/routes";

type Endpoint<Req, Res, Params = never, Query = never> = {
  req: Req;
  res: Res;
  params: Params;
  query: Query;
};

type TypedParsedQs<T> = {
  [Key in keyof T]: undefined | string | string[] | ParsedQs<T[Key]>;
};

export type Endpoints = {
  get: {
    "/postget": Endpoint<api.GetPost, api.GetPostResponse>;
  };
  post: {
    "/user": Endpoint<
      api.GetUser,
      api.GetUserResponse,
      api.GetUserParams,
      api.GetUserQuery
    >;
  };
  put: {
    "/post": Endpoint<api.GetPost, api.GetPostResponse>;
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
          Endpoints[Method][Path]["params"],
          Endpoints[Method][Path]["res"],
          Endpoints[Method][Path]["req"],
          Endpoints[Method][Path]["query"],
          Locals
        >
      >
    ): T;
    <
      P = ParamsDictionary,
      ReqQuery = ParsedQs,
      Locals extends Record<string, any> = Record<string, any>,
      Path extends MethodPath<Method>
    >(
      path: Path,
      // tslint:disable-next-line no-unnecessary-generics (This generic is meant to be passed explicitly.)
      ...handlers: Array<
        RequestHandlerParams<
          Endpoints[Method][Path]["params"],
          Endpoints[Method][Path]["res"],
          Endpoints[Method][Path]["req"],
          Endpoints[Method][Path]["query"],
          Locals
        >
      >
    ): T;
  }
}
