declare module "shared" {}

export type GetPostRequest = {
    id: string;
};

export interface Post {
    id: string;
    title: string;
    content: string;
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
