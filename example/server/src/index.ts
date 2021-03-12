import express, { RequestHandler, IRouterMatcher } from "express";
import { Post, PrismaClient } from "@prisma/client";
import { Routes, Validation, validate, SCHEMAS, CUSTOM_VALIDATORS } from "shared";
import {} from "express-serve-static-core";

// let client = new Client();
// client.fetch("post", "/post", { id: "100" });

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Method", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});

// app.get("/user", (req, res, next) => {
//     res.end("hello world");
// });

app.get("/users", async (req, res, next) => {
    let users = await prisma.user.findMany();
    res.json({
        users,
    });
});

app.get("/user", async (req, res, next) => {
    let error = validate(SCHEMAS.RoutesGetUserRequest, req.body, { req }, { abortEarly: false, otherSchemas: SCHEMAS, customValidators: CUSTOM_VALIDATORS });
    if (error) {
        return res.json({});
    }
    let user = await prisma.user.findUnique({ where: { id: req.body.userId } });
    if (!user) {
        return res.status(404).end();
    }
    res.json({
        user,
    });
});

app.post("/user", async (req, res, next) => {
    let error = validate(SCHEMAS.RoutesPostUserRequest, req.body, { req }, { abortEarly: false, otherSchemas: SCHEMAS, customValidators: CUSTOM_VALIDATORS });
    if (error) {
        console.log("user err", req.body, error);
        res.json({
            status: "error",
            error: error,
        });
        return;
    }

    let user = await prisma.user.create({
        data: req.body.user,
    });

    res.json({
        status: "ok",
        user,
    });
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
