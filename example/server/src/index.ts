import express, { RequestHandler, IRouterMatcher } from "express";

const app = express();
app.get("/", (req, res, next) => {
  res.end("hello world");
});


app.get("/postget", (req, res, next) => {
  req.body.
})

app.post("/user", function (req, res, next) {
  res.json({
    user: {

    }
  })
  //req.params.
});

app.put("/post", (req, res, next) => {

});

app.listen(3002);