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
