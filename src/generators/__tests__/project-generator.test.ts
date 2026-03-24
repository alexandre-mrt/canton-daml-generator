import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GeneratorOptions } from "../../types.js";
import { generateProject } from "../project-generator.js";

const TEST_DIR = join("/tmp", `daml-gen-test-${process.pid}`);

function makeOptions(overrides: Partial<GeneratorOptions> = {}): GeneratorOptions {
	return {
		outputDir: TEST_DIR,
		pattern: "asset",
		projectName: "test-project",
		moduleName: "TestAsset",
		templateName: "Token",
		typescript: true,
		tests: true,
		overwrite: true,
		...overrides,
	};
}

describe("generateProject", () => {
	beforeEach(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true });
		}
	});

	it("creates daml source file", () => {
		const result = generateProject(makeOptions());
		const damlFile = result.files.find((f) => f.path.endsWith("TestAsset.daml"));
		expect(damlFile).toBeDefined();
		expect(damlFile?.created).toBe(true);
		expect(existsSync(damlFile!.path)).toBe(true);
	});

	it("creates daml.yaml", () => {
		const result = generateProject(makeOptions());
		const yamlFile = result.files.find((f) => f.path.endsWith("daml.yaml"));
		expect(yamlFile).toBeDefined();
		expect(yamlFile?.created).toBe(true);
	});

	it("creates test script when tests=true", () => {
		const result = generateProject(makeOptions({ tests: true }));
		const testFile = result.files.find((f) => f.path.includes("Test.daml"));
		expect(testFile).toBeDefined();
		expect(testFile?.created).toBe(true);
	});

	it("creates typescript files when typescript=true", () => {
		const result = generateProject(makeOptions({ typescript: true }));
		const tsFiles = result.files.filter((f) => f.path.includes("typescript/"));
		expect(tsFiles.length).toBe(2);
		const typesFile = tsFiles.find((f) => f.path.endsWith(".types.ts"));
		const clientFile = tsFiles.find((f) => f.path.endsWith(".client.ts"));
		expect(typesFile).toBeDefined();
		expect(clientFile).toBeDefined();
	});

	it("creates fewer files when typescript=false", () => {
		const withTs = generateProject(makeOptions({ typescript: true }));
		// Clean up for second run
		rmSync(TEST_DIR, { recursive: true });
		mkdirSync(TEST_DIR, { recursive: true });
		const withoutTs = generateProject(makeOptions({ typescript: false }));
		expect(withoutTs.files.length).toBeLessThan(withTs.files.length);
		const tsFiles = withoutTs.files.filter((f) => f.path.includes("typescript/"));
		expect(tsFiles.length).toBe(0);
	});

	it("does not create test file when tests=false", () => {
		const result = generateProject(makeOptions({ tests: false }));
		const testFile = result.files.find((f) => f.path.includes("Test.daml"));
		expect(testFile).toBeUndefined();
	});

	it("skips existing files when overwrite=false", () => {
		// First run creates files
		generateProject(makeOptions({ overwrite: true }));
		// Second run with overwrite=false should skip
		const result = generateProject(makeOptions({ overwrite: false }));
		const skippedFiles = result.files.filter((f) => f.skipped);
		expect(skippedFiles.length).toBeGreaterThan(0);
	});

	it("overwrites existing files when overwrite=true", () => {
		// First run
		generateProject(makeOptions({ overwrite: true }));
		// Second run with overwrite=true should overwrite
		const result = generateProject(makeOptions({ overwrite: true }));
		const createdFiles = result.files.filter((f) => f.created);
		expect(createdFiles.length).toBeGreaterThan(0);
		const skippedFiles = result.files.filter((f) => f.skipped);
		expect(skippedFiles.length).toBe(0);
	});

	it("returns the resolved template in the result", () => {
		const result = generateProject(makeOptions({ pattern: "iou" }));
		expect(result.template.templateName).toBe("Token");
		expect(result.template.moduleName).toBe("TestAsset");
	});

	it("works with all patterns", () => {
		const patterns = [
			"asset", "iou", "proposal", "role", "registry",
			"escrow", "auction", "subscription", "custom",
		] as const;
		for (const pattern of patterns) {
			rmSync(TEST_DIR, { recursive: true });
			mkdirSync(TEST_DIR, { recursive: true });
			const result = generateProject(makeOptions({ pattern }));
			expect(result.files.length).toBeGreaterThan(0);
			expect(result.template).toBeDefined();
		}
	});
});
