import { z } from "zod";
import type {
  WorkflowActionDefinition,
  WorkflowComponentManifest,
  WorkflowComponentModule,
} from "./index";
import { isWorkflowActionKind } from "./actions";

export type WorkflowValidationIssue = {
  path: string;
  message: string;
};

export type WorkflowValidationResult = {
  valid: boolean;
  issues: WorkflowValidationIssue[];
};

const componentTypePattern = /^(core|local|[a-z][a-z0-9-]*)(\.[a-z][a-z0-9-]*)+$/;

function issue(path: string, message: string): WorkflowValidationIssue {
  return { path, message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsNonSerializableValue(value: unknown): boolean {
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsNonSerializableValue(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((item) => containsNonSerializableValue(item));
  }

  return false;
}

function isZodSchema(value: unknown): value is z.ZodTypeAny {
  return value instanceof z.ZodType;
}

function validateSize(
  value: { w: number; h: number } | undefined,
  path: string,
): WorkflowValidationIssue[] {
  if (!value) return [issue(path, "size is required")];

  const issues: WorkflowValidationIssue[] = [];
  if (!Number.isFinite(value.w) || value.w <= 0) {
    issues.push(issue(`${path}.w`, "width must be a positive number"));
  }
  if (!Number.isFinite(value.h) || value.h <= 0) {
    issues.push(issue(`${path}.h`, "height must be a positive number"));
  }
  return issues;
}

function validateActions(
  actions: WorkflowActionDefinition[] | undefined,
): WorkflowValidationIssue[] {
  if (!actions) return [];

  const issues: WorkflowValidationIssue[] = [];
  const ids = new Set<string>();

  actions.forEach((action, index) => {
    const prefix = `actions.${index}`;
    if (!action.id) {
      issues.push(issue(`${prefix}.id`, "action id is required"));
    } else if (ids.has(action.id)) {
      issues.push(issue(`${prefix}.id`, `duplicate action id: ${action.id}`));
    }
    ids.add(action.id);

    if (!action.title) {
      issues.push(issue(`${prefix}.title`, "action title is required"));
    }
    if (!action.kind || !isWorkflowActionKind(action.kind)) {
      issues.push(issue(`${prefix}.kind`, "action kind is not supported"));
    }
    if (action.inputSchema && !isZodSchema(action.inputSchema)) {
      issues.push(
        issue(`${prefix}.inputSchema`, "inputSchema must be a Zod schema"),
      );
    }
  });

  return issues;
}

export function validateComponentManifest(
  manifest: WorkflowComponentManifest,
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];

  if (!manifest.type || !componentTypePattern.test(manifest.type)) {
    issues.push(
      issue(
        "type",
        "type must be namespaced, for example core.monitor.http-health",
      ),
    );
  }
  if (!manifest.title) issues.push(issue("title", "title is required"));
  if (!manifest.description) {
    issues.push(issue("description", "description is required"));
  }
  if (!manifest.version) issues.push(issue("version", "version is required"));
  if (!manifest.icon) issues.push(issue("icon", "icon is required"));

  issues.push(...validateSize(manifest.defaultSize, "defaultSize"));
  if (manifest.minSize) {
    issues.push(...validateSize(manifest.minSize, "minSize"));
  }

  if (!isZodSchema(manifest.configSchema)) {
    issues.push(issue("configSchema", "configSchema must be a Zod schema"));
  } else {
    const result = manifest.configSchema.safeParse(manifest.defaultConfig);
    if (!result.success) {
      issues.push(
        ...result.error.issues.map((zodIssue) =>
          issue(
            `defaultConfig.${zodIssue.path.join(".")}`,
            zodIssue.message,
          ),
        ),
      );
    }
  }
  if (!isJsonSerializableConfig(manifest.defaultConfig)) {
    issues.push(
      issue("defaultConfig", "defaultConfig must be JSON-serializable"),
    );
  }

  issues.push(...validateActions(manifest.actions));

  return { valid: issues.length === 0, issues };
}

export function assertValidComponentManifest(
  manifest: WorkflowComponentManifest,
): void {
  const result = validateComponentManifest(manifest);
  if (!result.valid) {
    throw new Error(
      result.issues
        .map(
          (validationIssue) =>
            `${validationIssue.path}: ${validationIssue.message}`,
        )
        .join("\n"),
    );
  }
}

export function validateComponentRegistry(
  registry: WorkflowComponentModule[],
): WorkflowValidationResult {
  const issues: WorkflowValidationIssue[] = [];
  const types = new Set<string>();

  registry.forEach((component, index) => {
    const manifestResult = validateComponentManifest(component.manifest);
    issues.push(
      ...manifestResult.issues.map((manifestIssue) =>
        issue(`registry.${index}.${manifestIssue.path}`, manifestIssue.message),
      ),
    );

    if (types.has(component.manifest.type)) {
      issues.push(
        issue(
          `registry.${index}.type`,
          `duplicate component type: ${component.manifest.type}`,
        ),
      );
    }
    types.add(component.manifest.type);
  });

  return { valid: issues.length === 0, issues };
}

export function assertValidComponentRegistry(
  registry: WorkflowComponentModule[],
): void {
  const result = validateComponentRegistry(registry);
  if (!result.valid) {
    throw new Error(
      result.issues
        .map(
          (validationIssue) =>
            `${validationIssue.path}: ${validationIssue.message}`,
        )
        .join("\n"),
    );
  }
}

export function isJsonSerializableConfig(value: unknown): boolean {
  if (containsNonSerializableValue(value)) {
    return false;
  }
  if (!isPlainObject(value) && !Array.isArray(value)) {
    return value === null || ["string", "number", "boolean"].includes(typeof value);
  }

  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}
