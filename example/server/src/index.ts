import express, { RequestHandler, IRouterMatcher } from "express";
import { Post } from "@prisma/client";
import { Routes } from "shared";

// let client = new Client();
// client.fetch("post", "/post", { id: "100" });

const app = express();
app.get("/user", (req, res, next) => {
    res.end("hello world");
});

app.post("/user", (req, res, next) => {});

app.post("/post", (req, res, next) => {
    res.json({
        post: {},
    });
});

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
