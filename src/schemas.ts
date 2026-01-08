import { z } from "zod";

export const SimInfoSchema = z.object({
  type: z.string(),
  iccid: z.string(),
  homeNetworkOperator: z.string(),
  eid: z.string(),
  imsi: z.string(),
  phoneNumber: z.string(),
});

export type SimInfo = z.infer<typeof SimInfoSchema>;
