import { ErrorType } from "./generatedClient";
import { User, UserWithoutId, Gender, Post } from "./generatedPrisma";

export namespace Routes {
    export interface UserListResponse {
        users: User[];
    }

    export interface UserGetRequest {
        userId: number;
    }

    export interface UserGetResponse {
        user: User;
    }

    export interface UserCreateRequest {
        user: UserWithoutId;
    }

    export interface PostCreateRequest {
        title: string;
        content: string;
    }

    export interface PostCreateResponse {
        post: Post;
    }

    export interface UserPostListRequest {
        userId: number;
    }

    export interface UserPostListResponse {
        posts: Post[];
    }

    export type UserCreateResponse =
        | {
              status: "error";
              error: ErrorType<UserWithoutId>;
          }
        | {
              status: "ok";
              user: User;
          };
}

export namespace Validation {
    export function validateUserWithoutId(data: UserWithoutId) {
        if (data.email.length < 5) return { email: "must be longer" };
        return null;
    }

    export function validatePostPostRequest(data: Routes.UserCreateRequest) {
        return null;
    }

    export function validateDate(date: Date) {
        return null;
    }

    export function validateGender(gender: Gender) {
        return ["male", "female"].includes(gender) ? null : "invalid gender";
    }
}

export * from "./generatedClient";
export * from "./generatedPrisma";
export * from "./userRoutes";
