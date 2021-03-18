import { Client, ErrorMap, ErrorType } from "./generatedClient";

export const Gender: {
    male: "male";
    female: "female";
} = { male: "male", female: "female" };

export type Gender = typeof Gender[keyof typeof Gender];

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
    answers?: Answer[];
};

export type Post = {
    id: string;
    title: string;
    content: string;
    userId: number;
};

export type QuestionType = "multiple" | "open" | "number" | "location" | "title" | "multipletable";

export type Comparison = "contains" | "max" | "min";

export class Condition<TValue extends any = any> {
    id?: number;
    operator: Comparison;
    valueJson: TValue;

    question?: Question;

    constructor(operator: Comparison) {
        this.operator = operator;
        this.valueJson = {} as TValue;
    }

    static compare(a: string, b: string) {
        if (!(typeof a === "string") || !(typeof b === "string")) {
            console.warn("comparing non-string", a, b);
            return false;
        }
        return (
            a.trim().localeCompare(b.trim(), ["nl", "fr", "en"], {
                ignorePunctuation: true,
                sensitivity: "base",
            }) === 0
        );
    }
}

export interface Answer<TAnswer extends any = any> {
    userId: number;
    user?: User;
    questionId: number;
    question?: Question;
    valueJson: TAnswer;
    createdTimeStamp: number;
}

export class Question<TOptions extends any = any> {
    id?: number;
    parameter: string | null; // parameter is null when it is not tracked (for title)
    question: string;
    type: QuestionType;
    optional: boolean;
    optionsJson: TOptions | null;
    order: number;

    answers?: Answer[];
    conditions?: Condition[];

    constructor(
        conditions?: Condition[],
        optional: boolean = false,
        parameter: string | null = "",
        question: string = "",
        type: QuestionType = "open",
        optionsJson: TOptions | null = null,
        order: number = 0
    ) {
        this.optional = optional;
        this.parameter = parameter;
        this.question = question;
        this.type = type;
        this.conditions = conditions;
        this.optionsJson = optionsJson;
        this.order = order;
    }

    static clone(other: Question) {
        return new Question(other.conditions, other.optional, other.parameter, other.question, other.type, other.optionsJson, other.order);
    }
}

export namespace Routes {
    export interface UpdateEventRequest {
        event: Event;
        notifyUsers?: boolean;
    }

    export interface UserListResponse {
        users: User[];
    }

    export interface UserGetRequest {
        /**
         * @v-min 100 Must be larger than 100
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
