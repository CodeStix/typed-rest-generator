import express, { RequestHandler, IRouterMatcher } from "express";
import { Post } from "@prisma/client";
import { Routes } from "shared";
import {} from "express-serve-static-core";

// let client = new Client();
// client.fetch("post", "/post", { id: "100" });

const app = express();
app.get("/user", (req, res, next) => {
    res.end("hello world");
});

// app.post("/post", (req, res, next) => {
//     res.json({
//         post: {},
//     });
// });

// app.put("/post", (req, res, next) => {
//     res.json({});
// });

app.listen(3002);

interface ValidationContext {}

// function type<T, Context, Error = string>(
//     type: "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function",
//     message?: ErrorType<NonNullable<T>, Error>
// ): Validator<T, Context, Error> {
//     return (v, c) => typeof v !== type && (message ?? (`must be of type ${type}` as any));
// }

function validatePost(v: Post, context: ValidationContext) {
    return validateObject(
        {
            id: or(number(), string()),
            title: string({ null: true, typeMessage: "Invalid type", min: 5, max: 10, minMessage: "Title must be longer", maxMessage: "Title must be shorter" }),
            userId: number({ min: 0, max: 100 }),
            content: boolean(),
        },
        v,
        context
    );
}

function validate(route: Routes.PostPostResponse, context: ValidationContext) {
    return validateObject(
        {
            post: validatePost,
        },
        route,
        context
    );
}

console.log("validate...");
let res = validate({ post: { content: "yikers", id: "asdf", userId: 12, title: "nice asdf" } }, {});
console.log(res);
