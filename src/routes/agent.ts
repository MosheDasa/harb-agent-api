import { FastifyInstance } from "fastify";
import { AgentController } from "../controller/agent-controller";
import { logError } from "../utils/logger";
import { UserDataReq } from "../entity/user-data-entity";

export async function agentRoute(fastify: FastifyInstance) {
  fastify.post("userdata", async (request, reply) => {
    try {
      const reqBody = request.body as UserDataReq;
      const result = await AgentController.GET_USER_DATA(reqBody);
      return result;
    } catch (error) {
      logError("agentRoute", { error });
      return reply.status(500).send({ error: "Failed to access the page" });
    }
  });
}
