import express, { RequestHandler, IRouterMatcher } from "express";
import { Post } from "@prisma/client";

const app = express();
app.get("/", (req, res, next) => {
    res.end("hello world");
});

app.get("/postget", (req, res, next) => {});

app.get("/", (req, res, next) => {});

app.post("/user", (req, res, next) => {});

app.post("/user", function (req, res, next) {
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
