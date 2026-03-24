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

export interface GenerationResult {
	files: { path: string; created: boolean; skipped: boolean }[];
	template: DamlTemplate;
}

export function generateProject(options: GeneratorOptions): GenerationResult {
	const template = getPatternTemplate(
		options.pattern,
		options.moduleName,
		options.templateName,
	);

	const files: GenerationResult["files"] = [];

	// Generate Daml source
	const damlCode = generateDamlModule(template);
	files.push(
		writeFile(
			options.outputDir,
			`daml/${template.moduleName}.daml`,
			damlCode,
			options.overwrite,
		),
	);

	// Generate daml.yaml
	const damlYaml = generateDamlYaml(options.projectName, "3.4.0", [
		template.moduleName,
	]);
	files.push(
		writeFile(options.outputDir, "daml.yaml", damlYaml, options.overwrite),
	);

	// Generate test script
	if (options.tests) {
		const testCode = generateDamlScript(template);
		files.push(
			writeFile(
				options.outputDir,
				`daml/${template.moduleName}Test.daml`,
				testCode,
				options.overwrite,
			),
		);
	}

	// Generate TypeScript types and client
	if (options.typescript) {
		const tsTypes = generateTypeScriptTypes(template);
		files.push(
			writeFile(
				options.outputDir,
				`typescript/${template.templateName.toLowerCase()}.types.ts`,
				tsTypes,
				options.overwrite,
			),
		);

		const tsClient = generateTypeScriptClient(template);
		files.push(
			writeFile(
				options.outputDir,
				`typescript/${template.templateName.toLowerCase()}.client.ts`,
				tsClient,
				options.overwrite,
			),
		);
	}

	return { files, template };
}
