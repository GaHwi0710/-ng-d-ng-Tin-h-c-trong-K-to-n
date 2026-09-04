import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";

function parseId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function serialize(document) {
  if (!document) return document;
  const { _id, ...data } = document;
  return { id: _id.toString(), ...data };
}

export function createCrudModule(routeName, tableName) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const data = await getDatabase().collection(tableName).find().sort({ createdAt: -1 }).toArray();
      res.json({ table: tableName, data: data.map(serialize), message: `Danh sach ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID khong hop le" });
      const data = await getDatabase().collection(tableName).findOne({ _id: id });
      if (!data) return res.status(404).json({ message: `Khong tim thay ${routeName}` });
      res.json({ table: tableName, data: serialize(data), message: `Chi tiet ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const document = { ...req.body, createdAt: new Date(), updatedAt: new Date() };
      const result = await getDatabase().collection(tableName).insertOne(document);
      res.status(201).json({ table: tableName, data: serialize({ _id: result.insertedId, ...document }), message: `Tao moi ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID khong hop le" });
      const update = { ...req.body, updatedAt: new Date() };
      const result = await getDatabase().collection(tableName).findOneAndUpdate(
        { _id: id },
        { $set: update },
        { returnDocument: "after" }
      );
      if (!result) return res.status(404).json({ message: `Khong tim thay ${routeName}` });
      res.json({ table: tableName, data: serialize(result), message: `Cap nhat ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID khong hop le" });
      const result = await getDatabase().collection(tableName).deleteOne({ _id: id });
      if (!result.deletedCount) return res.status(404).json({ message: `Khong tim thay ${routeName}` });
      res.json({ table: tableName, id: req.params.id, message: `Xoa ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  return {
    path: `/${routeName}`,
    router
  };
}
