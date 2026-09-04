import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const databaseName = process.env.MONGODB_DB || "baby_shop_management";

const client = new MongoClient(uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000
});

let database;

export async function connectToMongoDB() {
  if (!database) {
    await client.connect();
    database = client.db(databaseName);
    await database.command({ ping: 1 });
    console.log(`Connected to MongoDB database: ${databaseName}`);
  }

  return database;
}

export function getDatabase() {
  if (!database) {
    throw new Error("MongoDB has not been connected");
  }

  return database;
}

export async function closeMongoDB() {
  await client.close();
  database = undefined;
}