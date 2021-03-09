// Only copies types from the library
import type { Post, User, PrismaClient } from "@prisma/client";
// Imports whole library
// import * as yup from "yup";

// Step 1: copy all types from this file
// Step 2: copy all deep references types from 'import type' statements
// Step 3: add all library imports and add to package.json
// Step 4: generate validation for every route
// Step 5: add validation overrides from Validation namespace
// Step 6: generate client library including validators & express types

interface ValidationContext {}

namespace Routes {
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

namespace Validation {
    function validatePostPostRequest(data: Routes.PostPostRequest, context: ValidationContext) {}

    function validatePostPostResponse(data: Routes.PostPostResponse, context: ValidationContext) {}

    function validateGetUserRequest(data: Routes.GetUserRequest, context: ValidationContext) {}

    function validateGetUserResponse(data: Routes.GetUserResponse, context: ValidationContext) {}

    function validateGetUserPostRequest(data: Routes.GetUserPostRequest, context: ValidationContext) {}
}
