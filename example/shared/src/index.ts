import { Client, ErrorMap, ErrorType } from "./generatedClient";

export const Gender: {
    male: "male";
    female: "female";
} = { male: "male", female: "female" };

export type Gender = typeof Gender[keyof typeof Gender];

export class Test {
    id?: number;
    name: string;
    duration: number;
    reward: number;
    description: string;
    minAge: number;
    maxAge: number;
    language: string;
    createdTimeStamp: number;
    notifiedUsers: boolean;

    constructor(name: string) {
        this.name = name;
        this.duration = 30;
        this.reward = 15;
        this.description = "";
        this.minAge = 12;
        this.maxAge = 75;
        this.language = "asdf";
        this.createdTimeStamp = new Date().getTime();
        this.notifiedUsers = false;
    }
}

export type User = {
    id: number;
    /**
     * @v-regex /^\S+@\S+\.\S+$/ Invalid email
     */
    email: string;
    /**
     * @v-min 1 Password must be longer
     */
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

export type QuestionType = "multiple" | "open" | "number" | "location" | "title" | "multipletable";

export interface MultipleAnswerValue {
    /**
     * @v-max 1000
     */
    selected: string[];
    /**
     * @v-max 1000
     */
    other?: string;
}

export interface OpenAnswerValue {
    /**
     * @v-max 1000
     */
    value: string;
}

export interface NumberAnswerValue {
    value: number;
}

export interface LocationAnswerValue {
    address: never;
}

export interface Question<T = MultipleAnswerValue | OpenAnswerValue | NumberAnswerValue | LocationAnswerValue | MultipleTableAnswerValue> {
    name: string;
    answer: T;
}
export interface MultipleTableAnswerValue {
    /**
     * @v-max 100
     */
    selected: string[][];
}

export namespace Routes {
    export interface UpdateEventRequest {
        test: Omit<Test, "events">;
        notifyUsers?: boolean;
    }

    export interface QuestionAnswerRequest {
        answer: Question;
    }

    export interface UserListResponse {
        users: User[];
    }
    export interface UserGetRequest {
        /**
         * @v-min 0 Must be larger than 0
         * @v-int false
         * @v-type Must be number
         */
        userId: number;
    }

    export interface UserGetResponse {
        user: User;
    }

    export type UserCreateRequest = Omit<User, "id">;

    export type UserCreateResponse =
        | {
              status: "error";
              error: ErrorType<Omit<User, "id">>;
          }
        | {
              status: "ok";
              user: User;
          };
}

export * from "./generatedClient";
// export * from "./generatedPrisma";
export * from "./userRoutes";
