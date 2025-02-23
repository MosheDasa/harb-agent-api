import { FastifyInstance } from "fastify";
import { AgentController } from "../controller/agent-controller";

export async function agentRoute(fastify: FastifyInstance) {
  fastify.get("/userdata", async (request, reply) => {
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
      console.error(error);
      return reply.status(500).send({ error: "Failed to access the page" });
    }
  });
}
