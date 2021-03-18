import { Client, ErrorMap, ErrorType } from "./generatedClient";
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

    export type UserCreateRequest = Omit<User, "id">;

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

export * from "./generatedClient";
export * from "./generatedPrisma";
export * from "./userRoutes";
