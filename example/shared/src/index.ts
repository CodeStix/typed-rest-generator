// Only copies types from the library
// Imports whole library
// import * as yup from "yup";

// Step 1: copy all types from this file
// Step 2: copy all deep references types from 'import type' statements
// Step 3: add all library imports and add to package.json
// Step 4: generate validation for every route
// Step 5: add validation overrides from Validation namespace
// Step 6: generate client library including validators & express types
import { CallTracker } from "assert";

export type Gender = typeof Gender[keyof typeof Gender];

export type User = {
    id: number;
    email: string;
    password: string;
    birthDate: Date;
    gender: Gender;
    tracker: CallTracker;
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

export interface ValidationContext {
    currentUser: User;
}

export namespace Routes {
    export type PostPostRequest = {
        id: string;
    };
    export interface PostPostResponse {
        post: Post;
    }
    export interface GetUserRequest {
        id: number;
    }
    export interface GetUserResponse {
        user: User;
    }
    export interface GetUserPostRequest {
        id: number;
        text: string;
    }
}

export namespace Validation {
    export function validatePostPostRequest(data: Routes.GetUserPostRequest, context: ValidationContext) {}
    export function validatePostPostResponse(data: Routes.PostPostResponse, context: ValidationContext) {}
    export function validateGetUserRequest(data: Routes.GetUserRequest, context: ValidationContext) {}
    export function validateGetUserResponse(data: Routes.GetUserResponse, context: ValidationContext) {}
    // function validateGetUserPostRequest(data: Routes.GetUserPostRequest, context: ValidationContext) {}
    export function validateContext(data: ValidationContext) {}
}
