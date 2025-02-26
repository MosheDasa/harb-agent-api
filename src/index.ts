import fastify, { FastifyReply, FastifyRequest } from "fastify";
import { logError, logInfo } from "./utils/logger";
import { agentRoute } from "./routes/agent";
import { asyncStorage, setRequestContext } from "./Hook/fastify";
import { v4 as uuidv4 } from "uuid";
const server = fastify();
server.addHook(
  "onRequest",
  (request: FastifyRequest, reply: FastifyReply, done) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.header("Access-Control-Allow-Methods", "GET,PATCH,PUT,POST,DELETE");
    reply.header("Access-Control-Expose-Headers", "Content-Length");
    reply.header(
      "Access-Control-Allow-Headers",
      "Accept, Authorization, x-auth-token, Content-Type, X-Requested-With, Range, x-user-id , x-client-id"
    );
    const requestId = uuidv4(); // יצירת מזהה ייחודי
    request.headers["x-request-id"] = requestId; // הוספתו לכותרת הבקשה
    if (request.method === "OPTIONS") {
      reply.code(200).send();
    } else {
      done();
    }
  }
);

server.addHook(
  "preHandler",
  (request: FastifyRequest, reply: FastifyReply, done) => {
    const userId = (request.headers["x-user-id"] as string) || "empty";
    const clientId = (request.headers["x-client-id"] as string) || "empty";
    const requestId = (request.headers["x-request-id"] as string) || "empty";

    // יצירת הקשר לכל חיי הבקשה
    asyncStorage.run(new Map(), () => {
      setRequestContext(userId, clientId, requestId + "#" + userId); // הגדרת ה-User ID בתוך ההקשר
      done(); // המשך עיבוד הבקשה
    });
  }
);

// טיפול בשגיאות כלליות
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err.name, err);
  logError("uncaughtException:" + err.name, err);
});

//server.register(agentRoute);
server.register(agentRoute, { prefix: "/api/" });

// הפעלת השרת
server.listen({ port: 3002, host: "0.0.0.0" });
logInfo(`Server running at http://localhost:3002`);
