import { Router } from "express";

const router = Router();

router.get("/revenue", (_req, res) => {
  res.json({ report: "revenue", total: 0, data: [] });
});

router.get("/inventory", (_req, res) => {
  res.json({ report: "inventory", data: [] });
});

router.get("/debts", (_req, res) => {
  res.json({ report: "debts", data: [] });
});

export default router;
