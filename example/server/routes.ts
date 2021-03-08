import { Post, User } from "@prisma/client";

export type GetPostRequest = {
    id: string;
};

interface Yikes {
    name: string;
    post: Post;
    yikers: Yikes2;
}

type Yikes2 = {
    name: string;
};

export interface GetPostResponse {
    yikes: Yikes;
    post: Date;
}

export type GetUserRequest = {
    yikes: Yikes | Yikes2;
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
