import { z } from "zod";

export const quotaSourceModes = ["manual", "file"] as const;

export type QuotaSourceMode = (typeof quotaSourceModes)[number];

export const quotaJsonMappingSchema = z.object({
  currentPath: z.string().trim().min(1).max(120),
  limitPath: z.string().trim().min(1).max(120),
});

export const quotaTrackerConfigSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    sourceMode: z.enum(quotaSourceModes),
    manualCurrent: z.number().min(0).max(Number.MAX_SAFE_INTEGER),
    manualLimit: z.number().positive().max(Number.MAX_SAFE_INTEGER),
    filePath: z.string().trim().max(1_000),
    jsonMapping: quotaJsonMappingSchema,
    warningThresholdPercent: z.number().min(0).max(100),
    criticalThresholdPercent: z.number().min(0).max(100),
    unitLabel: z.string().trim().min(1).max(24),
  })
  .superRefine((config, context) => {
    if (config.criticalThresholdPercent < config.warningThresholdPercent) {
      context.addIssue({
        code: "custom",
        path: ["criticalThresholdPercent"],
        message:
          "criticalThresholdPercent 必须大于或等于 warningThresholdPercent",
      });
    }

    if (config.sourceMode === "file" && config.filePath.trim().length === 0) {
      context.addIssue({
        code: "custom",
        path: ["filePath"],
        message: "sourceMode 为 file 时必须填写 filePath",
      });
    }
  });

export type QuotaTrackerConfig = z.infer<typeof quotaTrackerConfigSchema>;

export const defaultQuotaTrackerConfig: QuotaTrackerConfig =
  quotaTrackerConfigSchema.parse({
    label: "额度追踪",
    sourceMode: "manual",
    manualCurrent: 0,
    manualLimit: 100,
    filePath: "",
    jsonMapping: {
      currentPath: "current",
      limitPath: "limit",
    },
    warningThresholdPercent: 75,
    criticalThresholdPercent: 90,
    unitLabel: "单位",
  });
