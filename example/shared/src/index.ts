export type Gender = typeof Gender[keyof typeof Gender];

export type User = {
    id: number;
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

export const Gender = {
    male: "male",
    female: "female",
};

export namespace Routes {
    export interface PostUserRequest {
        user: User;
    }

    export type PostUserResponse =
        | {
              status: "error";
              err: any;
          }
        | never;
}

export namespace Validation {
    export function validatePostPostRequest(data: Routes.PostUserRequest) {
        console.log("custom validator got called!", JSON.stringify(data));
    }

    export function validateDate(date: Date) {
        console.log("validate date", date);
        return null;
    }
}

export * from "./output";
