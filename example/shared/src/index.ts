export const Gender: {
    male: "male";
    female: "female";
} = { male: "male", female: "female" };

export type Gender = typeof Gender[keyof typeof Gender];

export type User = {
    id: number;
    email: string;
    password: string;
    birthDate: Date;
    gender: Gender;
};

export type UserWithoutId = {
    email: string;
    password: string;
    birthDate: Date;
    gender: Gender;
};

export type Post = {
    id: string;
    title: string;
    content: string;
    userId: number;
};

export namespace Routes {
    export interface GetUsersResponse {
        users: User[];
    }

    export interface GetUserRequest {
        userId: number;
    }

    export interface GetUserResponse {
        user: User;
    }

    export interface PostUserRequest {
        user: UserWithoutId;
    }

    export type PostUserResponse =
        | {
              status: "error";
              error: any;
          }
        | {
              status: "ok";
              user: User;
          };
}

export namespace Validation {
    export function validatePostPostRequest(data: Routes.PostUserRequest) {
        if (data.user.email.length < 5) return { user: { email: "must be longer" } };
        return null;
    }

    export function validateDate(date: Date) {
        return null;
    }

    export function validateGender(gender: Gender) {
        return ["male", "female"].includes(gender) ? null : "invalid gender";
    }
}

export * from "./output";
