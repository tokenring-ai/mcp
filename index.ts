import {z} from "zod";

export const MCPConfigSchema = z.object({
  transports: z.record(z.string(), z.looseObject({type: z.string()}))
}).optional();



export {default as MCPService} from "./MCPService.ts";