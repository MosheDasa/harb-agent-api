import { FastifyInstance } from "fastify";
import { AgentController } from "../controller/agent-controller";
import { logError } from "../utils/logger";

export async function agentRoute(fastify: FastifyInstance) {
  fastify.post("/api/userdata", async (request, reply) => {
    try {
      const reqBody = {
        id: "306955741",
        bod: "1987-01-01",
        iis: "2023-10-01",
        userid: 7877,
      };
      const result = await AgentController.GET_USER_DATA(reqBody);
      return result;
    } catch (error) {
      logError("agentRoute", { error });
      return reply.status(500).send({ error: "Failed to access the page" });
    }
  });

  fastify.get("/api/userdata", async (request, reply) => {
    try {
      const reqBody = {
        id: "306955741",
        bod: "1987-01-01",
        iis: "2023-10-01",
        userid: 7877,
      };
      const result = await AgentController.GET_USER_DATA(reqBody);
      return result;
    } catch (error) {
      logError("agentRoute", { error });
      return reply.status(500).send({ error: "Failed to access the page" });
    }
  });
}
