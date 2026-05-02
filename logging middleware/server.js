const express = require("express");
const { Log } = require("./index");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    Log("backend", "info", "middleware", `Completed ${req.method} ${req.url} → ${res.statusCode} in ${duration}ms`);
  });
  next();
});

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});