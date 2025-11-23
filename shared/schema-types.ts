// Type interfaces for templates with details
import type { DeploymentTemplate, TemplateStep, TemplateVariable } from "./schema";

export interface DeploymentTemplateWithDetails extends DeploymentTemplate {
  steps?: TemplateStep[];
  variables?: TemplateVariable[];
}
