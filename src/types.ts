export interface DamlField {
	name: string;
	type: DamlType;
	description?: string;
}

export type DamlType =
	| "Party"
	| "Text"
	| "Int"
	| "Decimal"
	| "Bool"
	| "Date"
	| "Time"
	| "ContractId"
	| "Optional"
	| "List"
	| { optional: DamlType }
	| { list: DamlType }
	| { contractId: string };

export interface DamlChoice {
	name: string;
	consuming: boolean;
	controller: string;
	params: DamlField[];
	returnType: string;
	description?: string;
	body?: string;
}

export interface DamlTemplate {
	moduleName: string;
	templateName: string;
	fields: DamlField[];
	signatories: string[];
	observers: string[];
	choices: DamlChoice[];
	ensure?: string;
	key?: {
		type: string;
		expression: string;
		maintainer: string;
	};
	description?: string;
}

export interface ProjectConfig {
	name: string;
	version: string;
	sdkVersion: string;
	templates: DamlTemplate[];
	generateTypescript: boolean;
	generateTests: boolean;
}

export type TemplatePattern =
	| "asset"
	| "iou"
	| "proposal"
	| "role"
	| "registry"
	| "escrow"
	| "auction"
	| "subscription"
	| "custom";

export interface GeneratorOptions {
	outputDir: string;
	pattern: TemplatePattern;
	projectName: string;
	moduleName: string;
	templateName: string;
	typescript: boolean;
	tests: boolean;
	overwrite: boolean;
}
