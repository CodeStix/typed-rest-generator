declare module "shared" {}

export type GetPost = {
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

export type GetUser = {
    id: number;
};

// type GetUserQuery = {};

export type GetUserParams = {
    path: string;
};

export type GetUserResponse = {
    user: User;
};

export type GetUserQuery = {
    queryValue: string;
};

export type GetUserParams = {
    paramValue: string;
};
