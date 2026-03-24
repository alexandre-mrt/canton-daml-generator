import type { DamlType } from "../types.js";

export function damlTypeToString(type: DamlType): string {
	if (typeof type === "string") return type;
	if ("optional" in type) return `Optional ${damlTypeToString(type.optional)}`;
	if ("list" in type) return `[${damlTypeToString(type.list)}]`;
	if ("contractId" in type) return `ContractId ${type.contractId}`;
	return "Text";
}

export function damlTypeToTypeScript(type: DamlType): string {
	if (typeof type === "string") {
		const mapping: Record<string, string> = {
			Party: "string",
			Text: "string",
			Int: "number",
			Decimal: "number",
			Bool: "boolean",
			Date: "string",
			Time: "string",
			ContractId: "string",
		};
		return mapping[type] ?? "unknown";
	}
	if ("optional" in type) return `${damlTypeToTypeScript(type.optional)} | null`;
	if ("list" in type) return `${damlTypeToTypeScript(type.list)}[]`;
	if ("contractId" in type) return "string";
	return "unknown";
}

export function damlTypeToJsonApi(type: DamlType): string {
	if (typeof type === "string") {
		const mapping: Record<string, string> = {
			Party: "string",
			Text: "string",
			Int: "string (numeric)",
			Decimal: "string (numeric)",
			Bool: "boolean",
			Date: "string (YYYY-MM-DD)",
			Time: "string (ISO 8601)",
			ContractId: "string",
		};
		return mapping[type] ?? "unknown";
	}
	if ("optional" in type) return `${damlTypeToJsonApi(type.optional)} | null`;
	if ("list" in type) return `${damlTypeToJsonApi(type.list)}[]`;
	if ("contractId" in type) return "string";
	return "unknown";
}
