import { z } from "zod";

export const httpHealthMethods = ["GET", "HEAD", "POST"] as const;

export type HttpHealthMethod = (typeof httpHealthMethods)[number];

export const httpHealthMonitorConfigSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().url(),
  method: z.enum(httpHealthMethods),
  expectedStatus: z.number().int().min(100).max(599),
  intervalSeconds: z.number().int().min(5).max(86_400),
  timeoutMs: z.number().int().min(100).max(120_000),
  showLatency: z.boolean(),
});

export type HttpHealthMonitorConfig = z.infer<
  typeof httpHealthMonitorConfigSchema
>;

export const defaultHttpHealthMonitorConfig: HttpHealthMonitorConfig =
  httpHealthMonitorConfigSchema.parse({
    label: "HTTP 健康检查",
    url: "https://example.com/health",
    method: "GET",
    expectedStatus: 200,
    intervalSeconds: 60,
    timeoutMs: 5_000,
    showLatency: true,
  });
