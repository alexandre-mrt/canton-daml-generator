#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { resolve } from "node:path";
import { generateProject } from "./generators/project-generator.js";
import { getPatternTemplate } from "./generators/patterns.js";
import type { TemplatePattern } from "./types.js";

const PATTERNS: TemplatePattern[] = [
	"asset",
	"iou",
	"proposal",
	"role",
	"registry",
	"escrow",
	"auction",
	"subscription",
	"oracle",
	"token",
	"custom",
];

const FILE_ICONS: Record<string, string> = {
	".daml": chalk.magenta("daml"),
	".ts": chalk.cyan("ts"),
	".yaml": chalk.yellow("yaml"),
};

function getFileIcon(path: string): string {
	for (const [ext, icon] of Object.entries(FILE_ICONS)) {
		if (path.endsWith(ext)) return icon;
	}
	return chalk.gray("file");
}

function printFileTree(
	files: { path: string; created: boolean; skipped: boolean }[],
	dryRun: boolean,
): void {
	const prefix = dryRun ? chalk.blue("  DRY-RUN") : "";
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const isLast = i === files.length - 1;
		const connector = isLast ? chalk.gray("  └──") : chalk.gray("  ├──");
		const icon = getFileIcon(file.path);

		if (file.skipped) {
			console.log(`${connector} ${chalk.yellow("SKIP")} [${icon}] ${chalk.gray(file.path)}`);
		} else if (dryRun) {
			console.log(`${connector} ${chalk.blue("WOULD CREATE")} [${icon}] ${chalk.white(file.path)}`);
		} else {
			console.log(`${connector} ${chalk.green("CREATE")} [${icon}] ${chalk.white(file.path)}`);
		}
	}
}

const program = new Command();

program
	.name("daml-gen")
	.description(
		"CLI tool to scaffold Daml smart contracts for Canton Network with TypeScript integration",
	)
	.version("0.1.0");

program
	.command("generate")
	.alias("gen")
	.description("Generate a Daml smart contract from a pattern")
	.requiredOption(
		"-p, --pattern <pattern>",
		`Contract pattern: ${PATTERNS.join(", ")}`,
	)
	.option(
		"-n, --name <name>",
		"Template name (PascalCase)",
		"MyContract",
	)
	.option(
		"-m, --module <module>",
		"Daml module name",
	)
	.option(
		"-o, --output <dir>",
		"Output directory",
		".",
	)
	.option(
		"--project-name <name>",
		"Project name for daml.yaml",
		"my-canton-app",
	)
	.option("--typescript", "Generate TypeScript types and API client", true)
	.option("--no-typescript", "Skip TypeScript generation")
	.option("--tests", "Generate Daml test scripts", true)
	.option("--no-tests", "Skip test generation")
	.option("--overwrite", "Overwrite existing files", false)
	.option("--dry-run", "Preview generated files without writing to disk", false)
	.action((opts) => {
		const pattern = opts.pattern as TemplatePattern;
		if (!PATTERNS.includes(pattern)) {
			console.error(
				chalk.red(`Invalid pattern: ${pattern}. Choose from: ${PATTERNS.join(", ")}`),
			);
			process.exit(1);
		}

		const templateName = opts.name;
		const moduleName = opts.module ?? templateName;
		const outputDir = resolve(opts.output);
		const dryRun = opts.dryRun ?? false;

		console.log(chalk.blue.bold("\n  Canton Daml Generator\n"));
		console.log(chalk.gray(`  Pattern:    ${chalk.white(pattern)}`));
		console.log(chalk.gray(`  Template:   ${chalk.white(templateName)}`));
		console.log(chalk.gray(`  Module:     ${chalk.white(moduleName)}`));
		console.log(chalk.gray(`  Output:     ${chalk.white(outputDir)}`));
		console.log(
			chalk.gray(
				`  TypeScript: ${chalk.white(opts.typescript ? "yes" : "no")}`,
			),
		);
		console.log(
			chalk.gray(`  Tests:      ${chalk.white(opts.tests ? "yes" : "no")}`),
		);
		if (dryRun) {
			console.log(chalk.blue(`  Mode:       ${chalk.blue.bold("DRY RUN (no files will be written)")}`));
		}
		console.log("");

		const result = generateProject({
			outputDir,
			pattern,
			projectName: opts.projectName,
			moduleName,
			templateName,
			typescript: opts.typescript,
			tests: opts.tests,
			overwrite: opts.overwrite,
			dryRun,
		});

		console.log(chalk.gray("  Generated file tree:"));
		printFileTree(result.files, dryRun);

		const createdCount = result.files.filter((f) => f.created).length;
		const skippedCount = result.files.filter((f) => f.skipped).length;

		console.log("");
		if (dryRun) {
			console.log(
				chalk.blue.bold(
					`  Would generate ${result.files.length} files (dry run, nothing written)\n`,
				),
			);
		} else {
			console.log(
				chalk.green.bold(
					`  Generated ${createdCount} files${skippedCount > 0 ? chalk.yellow(` (${skippedCount} skipped)`) : ""}\n`,
				),
			);
		}

		// Print next steps
		if (!dryRun) {
			console.log(chalk.blue("  Next steps:"));
			console.log(chalk.gray("  1. Install Daml SDK: curl -sSL https://get.daml.com | sh"));
			console.log(chalk.gray(`  2. cd ${outputDir}`));
			console.log(chalk.gray("  3. daml build"));
			console.log(chalk.gray("  4. daml test --all"));
			console.log(chalk.gray("  5. daml start  (sandbox + JSON API)"));
			console.log("");
		}
	});

program
	.command("list")
	.description("List all available contract patterns")
	.action(() => {
		console.log(chalk.blue.bold("\n  Available Daml Contract Patterns\n"));

		for (const pattern of PATTERNS) {
			const template = getPatternTemplate(pattern, "Example", "Example");
			console.log(
				chalk.white.bold(`  ${pattern.padEnd(15)}`),
				chalk.gray(template.description ?? ""),
			);
			console.log(
				chalk.gray(
					`${"".padEnd(17)}Fields: ${template.fields.length} | Choices: ${template.choices.length} | Signatories: ${template.signatories.join(", ")}`,
				),
			);
			console.log("");
		}
	});

program
	.command("preview")
	.description("Preview the generated Daml code without writing files")
	.requiredOption("-p, --pattern <pattern>", "Contract pattern")
	.option("-n, --name <name>", "Template name", "Preview")
	.option("-m, --module <module>", "Module name")
	.action(async (opts) => {
		const pattern = opts.pattern as TemplatePattern;
		if (!PATTERNS.includes(pattern)) {
			console.error(chalk.red(`Invalid pattern: ${pattern}`));
			process.exit(1);
		}

		const { generateDamlModule } = await import("./generators/daml-generator.js");
		const template = getPatternTemplate(
			pattern,
			opts.module ?? opts.name,
			opts.name,
		);
		console.log(chalk.blue.bold(`\n  Preview: ${pattern} pattern\n`));
		console.log(generateDamlModule(template));
	});

program.parse();
