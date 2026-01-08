import { session } from "../clients/ssh";
import { type SimInfo, SimInfoSchema } from "../schemas";

export const getSimInfo = async (): Promise<SimInfo> => {
  const simCommand = await session.executeCommand(`sim info`);

  const lines = simCommand.trim().split("\n");
  const rawData: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    rawData[key] = value;
  }

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
