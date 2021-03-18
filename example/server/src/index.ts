import express, { RequestHandler, IRouterMatcher } from "express";
import { Post, PrismaClient } from "@prisma/client";
import { withValidator } from "shared";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Method", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    next();
});

app.post("/user/list", withValidator("/user/list"), async (req, res, next) => {
    let users = await prisma.user.findMany();
    res.json({
        users,
    });
});

app.post("/user/create", withValidator("/user/create"), async (req, res, next) => {
    console.log(JSON.stringify(req.body));
    if ((await prisma.user.count({ where: { email: req.body.email } })) !== 0) {
        return res.json({ status: "error", error: { email: "User with this email already exists" } });
    }

    let user = await prisma.user.create({
        data: req.body,
    });

    res.json({ status: "ok", user: user });
});

app.post("/user/get", withValidator("/user/get"), async (req, res, next) => {
    let user = await prisma.user.findUnique({ where: { id: req.body.userId } });
    if (!user) {
        return res.status(404).end();
    }
    res.json({
        user,
    });
});

app.listen(3002);
