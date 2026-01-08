import { type SimInfo, SimInfoSchema } from "./schemas";
import { session } from "./ssh";

export const getSimInfo = async (): Promise<SimInfo> => {
  const simCommand = await session.executeCommand(`sim info`);

  // Parse the output into an object
  const lines = simCommand.trim().split("\n");
  const rawData: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    rawData[key] = value;
  }

  // Map to camelCase and validate with Zod schema
  const simData = {
    type: rawData["Type"],
    iccid: rawData["ICCID"],
    homeNetworkOperator: rawData["Home Network Operator"],
    eid: rawData["EID"],
    imsi: rawData["IMSI"],
    phoneNumber: rawData["Phone Number"],
  };

  return SimInfoSchema.parse(simData);
};
