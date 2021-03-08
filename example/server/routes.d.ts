import { Post, User } from "@prisma/client";

export type PostPostRequest = {
    id: string;
};

export interface PostPostResponse {
    post: Post;
}

export interface PostUserRequest {
    id: number;
}

export interface PostUserResponse {
    user: User;
}

export interface PostUserRequestQuery {
    queryValue: string;
}

export interface PostUserRequestParams {
    paramValue: string;
}

export interface PostUserPostRequest {
    id: number;
    text: string;
}
