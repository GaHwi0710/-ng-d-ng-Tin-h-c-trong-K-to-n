import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabase } from "./config/mongodb.js";
import routes from "./routes/index.js";

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(currentDirectory, "../../frontend/dist");

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  try {
    getDatabase().command({ ping: 1 }).then(() => {
      res.json({ status: "ok", service: "baby-shop-management-api", database: "connected" });
    }).catch(() => {
      res.status(503).json({ status: "error", service: "baby-shop-management-api", database: "unavailable" });
    });
  } catch {
    res.status(503).json({ status: "error", service: "baby-shop-management-api", database: "disconnected" });
  }
});

app.use("/api", routes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "Lỗi máy chủ" });
});

app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;
