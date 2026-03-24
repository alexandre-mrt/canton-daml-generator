import type { DamlChoice, DamlTemplate } from "../types.js";
import { damlTypeToString } from "../utils/daml-types.js";

export function generateDamlModule(template: DamlTemplate): string {
	const lines: string[] = [];

	lines.push(`module ${template.moduleName} where`);
	lines.push("");
	lines.push("import Daml.Script");
	lines.push("");

	if (template.description) {
		lines.push(`-- | ${template.description}`);
	}

	lines.push(`template ${template.templateName}`);
	lines.push("  with");

	for (const field of template.fields) {
		const comment = field.description ? ` -- ^ ${field.description}` : "";
		lines.push(
			`    ${field.name} : ${damlTypeToString(field.type)}${comment}`,
		);
	}

	lines.push("  where");

	// Signatories
	lines.push(`    signatory ${template.signatories.join(", ")}`);

	// Observers
	if (template.observers.length > 0) {
		lines.push(`    observer ${template.observers.join(", ")}`);
	}

	// Ensure clause
	if (template.ensure) {
		lines.push(`    ensure ${template.ensure}`);
	}

	// Key
	if (template.key) {
		lines.push(`    key ${template.key.expression} : ${template.key.type}`);
		lines.push(`    maintainer ${template.key.maintainer}`);
	}

	lines.push("");

	// Choices
	for (const choice of template.choices) {
		lines.push(generateChoice(choice));
		lines.push("");
	}

	// If this is a proposal template, include the Agreement template in the same module
	const hasAgreementRef = template.choices.some(
		(c) =>
			c.returnType.includes("Agreement") ||
			(c.body && c.body.includes("Agreement")),
	);
	if (hasAgreementRef) {
		lines.push(`-- | Binding agreement created when a proposal is accepted`);
		lines.push(`template ${template.templateName}Agreement`);
		lines.push("  with");
		lines.push("    proposer : Party");
		lines.push("    accepter : Party");
		lines.push("    terms : Text");
		lines.push("  where");
		lines.push("    signatory proposer, accepter");
		lines.push("");
		lines.push("    choice Terminate : ()");
		lines.push("      controller proposer, accepter");
		lines.push("        do");
		lines.push("          return ()");
		lines.push("");
	}

	return lines.join("\n");
}

function generateChoice(choice: DamlChoice): string {
	const lines: string[] = [];
	const consumingPrefix = choice.consuming ? "" : "nonconsuming ";

	if (choice.description) {
		lines.push(`    -- | ${choice.description}`);
	}

	lines.push(
		`    ${consumingPrefix}choice ${choice.name} : ${choice.returnType}`,
	);

	if (choice.params.length > 0) {
		lines.push("      with");
		for (const param of choice.params) {
			lines.push(
				`        ${param.name} : ${damlTypeToString(param.type)}`,
			);
		}
	}

	lines.push(`      controller ${choice.controller}`);

	if (choice.body) {
		const trimmedBody = choice.body.trimStart();
		if (trimmedBody.startsWith("do")) {
			// Body already has a do block
			const bodyLines = trimmedBody.split("\n");
			for (const line of bodyLines) {
				lines.push(`        ${line.trim()}`);
			}
		} else {
			lines.push("        do");
			const bodyLines = choice.body.split("\n");
			for (const line of bodyLines) {
				lines.push(`          ${line.trim()}`);
			}
		}
	} else {
		lines.push("        do");
		lines.push("          return ()");
	}

	return lines.join("\n");
}

export function generateDamlYaml(
	projectName: string,
	sdkVersion: string,
	modules: string[],
): string {
	return `sdk-version: ${sdkVersion}
name: ${projectName}
version: 0.1.0
source: daml
init-script: Setup:setup
parties:
  - Alice
  - Bob
build-options:
  - --ghc-option
  - -Werror
dependencies:
  - daml-prim
  - daml-stdlib
  - daml-script
`;
}

export function generateDamlScript(template: DamlTemplate): string {
	const lines: string[] = [];

	lines.push(`module ${template.moduleName}Test where`);
	lines.push("");
	lines.push("import Daml.Script");
	lines.push(`import ${template.moduleName}`);
	lines.push("");
	lines.push(`-- | Test script for ${template.templateName}`);
	lines.push(`test${template.templateName} : Script ()`);
	lines.push(`test${template.templateName} = do`);

	// Allocate parties
	const allParties = new Set<string>();
	for (const s of template.signatories) allParties.add(s);
	for (const o of template.observers) allParties.add(o);
	for (const choice of template.choices) {
		allParties.add(choice.controller);
		for (const p of choice.params) {
			if (p.type === "Party") allParties.add(p.name);
		}
	}

	const partyNames = [...allParties];
	for (const party of partyNames) {
		const capitalized = party.charAt(0).toUpperCase() + party.slice(1);
		lines.push(`  ${party} <- allocateParty "${capitalized}"`);
	}

	lines.push("");
	lines.push(`  -- Create ${template.templateName}`);
	lines.push(
		`  cid <- submit ${template.signatories[0]} $ createCmd ${template.templateName} with`,
	);

	for (const field of template.fields) {
		const defaultValue = getDefaultTestValue(field.type, field.name, partyNames);
		lines.push(`    ${field.name} = ${defaultValue}`);
	}

	lines.push("");

	// Test first choice if available
	if (template.choices.length > 0) {
		const choice = template.choices[0];
		lines.push(`  -- Exercise ${choice.name}`);
		const submitter = choice.controller;
		lines.push(
			`  submit ${submitter} $ exerciseCmd cid ${choice.name} with`,
		);
		for (const param of choice.params) {
			const defaultVal = getDefaultTestValue(param.type, param.name, partyNames);
			lines.push(`    ${param.name} = ${defaultVal}`);
		}
		if (choice.params.length === 0) {
			// Remove the "with" if no params
			lines[lines.length - 1] = `  submit ${submitter} $ exerciseCmd cid ${choice.name}`;
		}
	}

	lines.push("");
	lines.push("  return ()");

	return lines.join("\n");
}

function getDefaultTestValue(
	type: DamlTemplate["fields"][0]["type"],
	fieldName: string,
	parties: string[],
): string {
	if (typeof type === "string") {
		const defaults: Record<string, string> = {
			Party: parties.find((p) => p !== parties[0]) ?? parties[0],
			Text: `"test-${fieldName}"`,
			Int: "42",
			Decimal: "100.0",
			Bool: "True",
			Date: 'date 2026 Jan 1',
			Time: 'time (date 2026 Jan 1) 0 0 0',
		};
		if (type === "Party" && fieldName === parties[0]) return parties[0];
		return defaults[type] ?? `"default"`;
	}
	if ("optional" in type) return "None";
	if ("list" in type) return "[]";
	if ("contractId" in type) return "cid";
	return `"default"`;
}
