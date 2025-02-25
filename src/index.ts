import fastify from "fastify";
import { logError, logInfo } from "./utils/logger";
import { agentRoute } from "./routes/agent";

const server = fastify();

async function startServer() {
  try {
    logInfo("Registering routes...");

    // רישום המסלולים בצורה בטוחה
    await server.register(agentRoute);
    logInfo("agent route registered successfully.");

    // הפעלת השרת
    await server.listen({ port: 3002, host: "0.0.0.0" });
    logInfo(`Server running at http://localhost:3002`);
  } catch (error) {
    logError("Failed to start server:", { error });
    process.exit(1);
  }
}

startServer();
