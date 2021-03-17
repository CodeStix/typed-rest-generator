import express, { RequestHandler, IRouterMatcher } from "express";
import { Post, PrismaClient } from "@prisma/client";
import { Client, typedRouter } from "shared";

const app = typedRouter(express());
const prisma = new PrismaClient();

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Method", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});

app.typed("/user/list", async (req, res, next) => {
    let users = await prisma.user.findMany();
    res.json({
        users,
    });
});

app.typed("/user/create", async (req, res, next) => {
    let user = await prisma.user.create({
        data: req.body,
    });

    res.json({ status: "ok", user: user });
});

app.typed("/user/get", async (req, res, next) => {
    let user = await prisma.user.findUnique({ where: { id: req.body.userId } });
    if (!user) {
        return res.status(404).end();
    }
    res.json({
        user,
    });
});

app.listen(3002);
