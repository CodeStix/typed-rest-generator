import { Post, User } from "@prisma/client";

export type GetPostRequest = {
    id: string;
};

export interface GetPostResponse {
    post: Post;
}

export type GetUserRequest = {
    id: number;
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
