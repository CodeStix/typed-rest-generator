import express, { RequestHandler, IRouterMatcher } from "express";
import { Post } from "@prisma/client";
import { Endpoints, MethodPath } from "shared";

const app = express();
app.get("/user" as MethodPath<"get">, (req, res, next) => {
    res.end("hello world");
});

app.post("/", (req, res, next) => {});

app.post("", function (req, res, next) {
    req.query.queryValue;
    res.json({
        user: {},
    });
    //req.params.
});

app.put("/post", (req, res, next) => {
    res.json({});
});

app.listen(3002);
