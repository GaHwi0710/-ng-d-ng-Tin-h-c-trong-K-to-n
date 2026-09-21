import "dotenv/config";
import app from "./app.js";
import { closeMongoDB, connectToMongoDB } from "./config/mongodb.js";
import { seedDatabase } from "./config/seed.js";

const port = process.env.PORT || 5000;

try {
  const database = await connectToMongoDB();
  await seedDatabase(database);
  const server = app.listen(port, () => {
    console.log(`Baby shop management API is running on port ${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closeMongoDB();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (error) {
  console.error("Unable to start API because MongoDB is unavailable:", error.message);
  process.exit(1);
}
