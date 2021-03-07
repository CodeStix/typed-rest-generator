import express from "express";

const app = express();
app.get("/", (req, res, next) => {
  res.end("hello world");
});

app.listen(3002);
