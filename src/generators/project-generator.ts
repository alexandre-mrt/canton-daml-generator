import type { DamlTemplate, GeneratorOptions } from "../types.js";
import { writeFile } from "../utils/file-writer.js";
import {
	generateDamlModule,
	generateDamlScript,
	generateDamlYaml,
} from "./daml-generator.js";
import { getPatternTemplate } from "./patterns.js";
import {
	generateTypeScriptClient,
	generateTypeScriptTypes,
} from "./typescript-generator.js";
import { join } from "node:path";

export interface GenerationResult {
	files: { path: string; created: boolean; skipped: boolean }[];
	template: DamlTemplate;
}

function dryRunFile(
	basePath: string,
	relativePath: string,
): { path: string; created: boolean; skipped: boolean } {
	return { path: join(basePath, relativePath), created: false, skipped: false };
}

export function generateProject(options: GeneratorOptions): GenerationResult {
	const template = getPatternTemplate(
		options.pattern,
		options.moduleName,
		options.templateName,
	);

	const files: GenerationResult["files"] = [];
	const isDryRun = options.dryRun ?? false;

	// Generate Daml source
	const damlCode = generateDamlModule(template);
	const damlPath = `daml/${template.moduleName}.daml`;
	files.push(
		isDryRun
			? dryRunFile(options.outputDir, damlPath)
			: writeFile(options.outputDir, damlPath, damlCode, options.overwrite),
	);

	// Generate daml.yaml
	const damlYaml = generateDamlYaml(options.projectName, "3.4.0", [
		template.moduleName,
	]);
	files.push(
		isDryRun
			? dryRunFile(options.outputDir, "daml.yaml")
			: writeFile(options.outputDir, "daml.yaml", damlYaml, options.overwrite),
	);

	// Generate test script
	if (options.tests) {
		const testCode = generateDamlScript(template);
		const testPath = `daml/${template.moduleName}Test.daml`;
		files.push(
			isDryRun
				? dryRunFile(options.outputDir, testPath)
				: writeFile(options.outputDir, testPath, testCode, options.overwrite),
		);
	}

	// Generate TypeScript types and client
	if (options.typescript) {
		const tsTypes = generateTypeScriptTypes(template);
		const typesPath = `typescript/${template.templateName.toLowerCase()}.types.ts`;
		files.push(
			isDryRun
				? dryRunFile(options.outputDir, typesPath)
				: writeFile(options.outputDir, typesPath, tsTypes, options.overwrite),
		);

		const tsClient = generateTypeScriptClient(template);
		const clientPath = `typescript/${template.templateName.toLowerCase()}.client.ts`;
		files.push(
			isDryRun
				? dryRunFile(options.outputDir, clientPath)
				: writeFile(options.outputDir, clientPath, tsClient, options.overwrite),
		);
	}

	return { files, template };
}
