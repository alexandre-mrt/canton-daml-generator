import type { DamlTemplate } from "../types.js";
import { damlTypeToTypeScript } from "../utils/daml-types.js";

export function generateTypeScriptTypes(template: DamlTemplate): string {
	const lines: string[] = [];

	lines.push("// Auto-generated TypeScript types for Daml templates");
	lines.push(`// Template: ${template.templateName}`);
	lines.push(`// Module: ${template.moduleName}`);
	lines.push("");

	// Main contract interface
	lines.push(`export interface ${template.templateName} {`);
	for (const field of template.fields) {
		const tsType = damlTypeToTypeScript(field.type);
		const comment = field.description ? ` /** ${field.description} */` : "";
		if (comment) lines.push(`  ${comment}`);
		lines.push(`  ${field.name}: ${tsType};`);
	}
	lines.push("}");
	lines.push("");

	// Choice interfaces
	for (const choice of template.choices) {
		if (choice.params.length > 0) {
			lines.push(`export interface ${choice.name}Args {`);
			for (const param of choice.params) {
				lines.push(`  ${param.name}: ${damlTypeToTypeScript(param.type)};`);
			}
			lines.push("}");
			lines.push("");
		}
	}

	// Contract ID type
	lines.push(
		`export type ${template.templateName}ContractId = string & { __brand: "${template.templateName}" };`,
	);
	lines.push("");

	// API helper type
	lines.push(`export interface ${template.templateName}Contract {`);
	lines.push(`  contractId: ${template.templateName}ContractId;`);
	lines.push(`  payload: ${template.templateName};`);
	lines.push("}");
	lines.push("");

	return lines.join("\n");
}

export function generateTypeScriptClient(template: DamlTemplate): string {
	const lines: string[] = [];

	lines.push("// Auto-generated Canton JSON API client");
	lines.push(`// Template: ${template.templateName}`);
	lines.push("");
	lines.push(
		`import type { ${template.templateName}, ${template.templateName}Contract, ${template.templateName}ContractId } from "./${template.templateName.toLowerCase()}.types";`,
	);

	// Import choice arg types
	const choiceImports = template.choices
		.filter((c) => c.params.length > 0)
		.map((c) => `${c.name}Args`);
	if (choiceImports.length > 0) {
		lines[lines.length - 1] = lines[lines.length - 1].replace(
			"} from",
			`, ${choiceImports.join(", ")} } from`,
		);
	}

	lines.push("");
	lines.push("const TEMPLATE_ID = `${PACKAGE_ID}:${MODULE_NAME}:${TEMPLATE_NAME}`;");
	lines.push("");

	lines.push(`const PACKAGE_ID = "YOUR_PACKAGE_ID"; // Replace after daml build`);
	lines.push(`const MODULE_NAME = "${template.moduleName}";`);
	lines.push(`const TEMPLATE_NAME = "${template.templateName}";`);
	lines.push("");

	lines.push("interface ApiConfig {");
	lines.push("  baseUrl: string;");
	lines.push("  token: string;");
	lines.push("}");
	lines.push("");

	lines.push(`export class ${template.templateName}Client {`);
	lines.push("  private config: ApiConfig;");
	lines.push("");
	lines.push("  constructor(config: ApiConfig) {");
	lines.push("    this.config = config;");
	lines.push("  }");
	lines.push("");

	// Fetch helper
	lines.push("  private async request<T>(endpoint: string, body: unknown): Promise<T> {");
	lines.push("    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {");
	lines.push('      method: "POST",');
	lines.push("      headers: {");
	lines.push('        "Content-Type": "application/json",');
	lines.push("        Authorization: `Bearer ${this.config.token}`,");
	lines.push("      },");
	lines.push("      body: JSON.stringify(body),");
	lines.push("    });");
	lines.push("    if (!response.ok) {");
	lines.push("      throw new Error(`API error: ${response.status} ${response.statusText}`);");
	lines.push("    }");
	lines.push("    return response.json();");
	lines.push("  }");
	lines.push("");

	// Create
	lines.push(
		`  async create(payload: ${template.templateName}): Promise<${template.templateName}ContractId> {`,
	);
	lines.push('    const result = await this.request<{ contractId: string }>("/v2/create", {');
	lines.push("      templateId: TEMPLATE_ID,");
	lines.push("      payload,");
	lines.push("    });");
	lines.push(
		`    return result.contractId as ${template.templateName}ContractId;`,
	);
	lines.push("  }");
	lines.push("");

	// Query
	lines.push(
		`  async query(filter?: Partial<${template.templateName}>): Promise<${template.templateName}Contract[]> {`,
	);
	lines.push(
		'    const result = await this.request<{ result: { contractId: string; payload: unknown }[] }>("/v2/query", {',
	);
	lines.push("      templateId: TEMPLATE_ID,");
	lines.push("      query: filter ?? {},");
	lines.push("    });");
	lines.push(
		`    return result.result.map((r) => ({`,
	);
	lines.push(
		`      contractId: r.contractId as ${template.templateName}ContractId,`,
	);
	lines.push(
		`      payload: r.payload as ${template.templateName},`,
	);
	lines.push("    }));");
	lines.push("  }");
	lines.push("");

	// Exercise choices
	for (const choice of template.choices) {
		const argsParam =
			choice.params.length > 0 ? `args: ${choice.name}Args` : "";
		const argsBody =
			choice.params.length > 0 ? "      argument: args," : "";

		lines.push(
			`  async exercise${choice.name}(contractId: ${template.templateName}ContractId${argsParam ? `, ${argsParam}` : ""}): Promise<unknown> {`,
		);
		lines.push(
			'    return this.request("/v2/exercise", {',
		);
		lines.push("      templateId: TEMPLATE_ID,");
		lines.push("      contractId,");
		lines.push(`      choice: "${choice.name}",`);
		if (argsBody) lines.push(argsBody);
		lines.push("    });");
		lines.push("  }");
		lines.push("");
	}

	lines.push("}");

	return lines.join("\n");
}
