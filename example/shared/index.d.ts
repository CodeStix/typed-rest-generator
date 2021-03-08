import { Exporttest } from "./second";

export type GetPostRequest = {
    id: string;
};

interface Yikes {
    test: string;
    exports: Exporttest;
}

export interface Post {
    id: string;
    title: string;
    content: string;
    yikes: Yikes;
}

export interface GetPostResponse {
    post: Post;
}

export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
}

export type GetUserRequest = {
    id: number;
};

export type GetUserRequestParams = {
    path: string;
};

export type GetUserResponse = {
    user: User;
};

export type GetUserRequestQuery = {
    queryValue: string;
};

export type GetUserRequestParams = {
    paramValue: string;
};

export interface GetUserPostRequest {
    id: number;
    text: string;
}
