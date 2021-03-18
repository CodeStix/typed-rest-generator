import { Client, ErrorMap, ErrorType } from "./generatedClient";
import { User, Gender, Post } from "./generatedPrisma";

export interface Event {
    id: string;
    title: string;
    description: string;
    testId?: number;
    createdTimeStamp: number;
    notifiedUsers: boolean;
}

export namespace Routes {
    export interface UpdateEventRequest {
        event: Event;
        notifyUsers: boolean;
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
export * from "./generatedPrisma";
export * from "./userRoutes";
