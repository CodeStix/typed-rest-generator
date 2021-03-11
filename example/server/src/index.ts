import express, { RequestHandler, IRouterMatcher } from "express";
import { Post } from "@prisma/client";
import { Routes, Validation, validate, SCHEMAS, CUSTOM_VALIDATORS } from "shared";
import {} from "express-serve-static-core";

// let client = new Client();
// client.fetch("post", "/post", { id: "100" });

const app = express();

app.use(express.json());
app.use((req, res, next) => {
    console.log("setting headers");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Method", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});

// app.get("/user", (req, res, next) => {
//     res.end("hello world");
// });

app.post("/user", (req, res, next) => {
    let err = validate(SCHEMAS.RoutesPostUserRequest, req.body, {} as any, { abortEarly: false, otherSchemas: SCHEMAS, customValidators: CUSTOM_VALIDATORS });
    if (err) {
        console.log("user err", req.body, err);
        res.json({
            status: "error",
            err,
        });
    }

    console.log("user ok", req.body);
    res.json();
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
