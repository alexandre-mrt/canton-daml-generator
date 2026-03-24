import { describe, expect, it } from "vitest";
import {
	generateDamlModule,
	generateDamlScript,
	generateDamlYaml,
} from "../daml-generator.js";
import { getPatternTemplate } from "../patterns.js";

describe("generateDamlModule", () => {
	it("starts with module declaration", () => {
		const template = getPatternTemplate("asset", "TokenAsset", "Token");
		const code = generateDamlModule(template);
		expect(code).toMatch(/^module TokenAsset where/);
	});

	it("imports Daml.Script", () => {
		const template = getPatternTemplate("asset", "TokenAsset", "Token");
		const code = generateDamlModule(template);
		expect(code).toContain("import Daml.Script");
	});

	it("contains template keyword with template name", () => {
		const template = getPatternTemplate("asset", "M", "MyToken");
		const code = generateDamlModule(template);
		expect(code).toContain("template MyToken");
	});

	it("contains signatory clause", () => {
		const template = getPatternTemplate("asset", "M", "T");
		const code = generateDamlModule(template);
		expect(code).toContain("signatory issuer");
	});

	it("contains observer clause", () => {
		const template = getPatternTemplate("asset", "M", "T");
		const code = generateDamlModule(template);
		expect(code).toContain("observer owner");
	});

	it("contains choice keyword for each choice", () => {
		const template = getPatternTemplate("asset", "M", "T");
		const code = generateDamlModule(template);
		expect(code).toContain("choice Transfer");
		expect(code).toContain("choice Split");
		expect(code).toContain("choice Merge");
	});

	it("includes ensure clause when present", () => {
		const template = getPatternTemplate("asset", "M", "T");
		const code = generateDamlModule(template);
		expect(code).toContain("ensure amount > 0.0");
	});

	it("includes key clause when present", () => {
		const template = getPatternTemplate("asset", "M", "T");
		const code = generateDamlModule(template);
		expect(code).toContain("key (issuer, symbol, owner)");
		expect(code).toContain("maintainer key._1");
	});

	it("includes field descriptions as comments", () => {
		const template = getPatternTemplate("asset", "M", "T");
		const code = generateDamlModule(template);
		expect(code).toContain("-- ^ Asset issuer");
	});

	it("generates nonconsuming prefix for nonconsuming choices", () => {
		const template = getPatternTemplate("escrow", "M", "Escrow");
		const code = generateDamlModule(template);
		expect(code).toContain("nonconsuming choice Dispute");
	});

	it("proposal pattern includes Agreement template", () => {
		const template = getPatternTemplate("proposal", "Proposals", "Deal");
		const code = generateDamlModule(template);
		expect(code).toContain("template DealAgreement");
		expect(code).toContain("signatory proposer, accepter");
		expect(code).toContain("choice Terminate");
	});

	it("non-proposal pattern does not include Agreement template", () => {
		const template = getPatternTemplate("asset", "M", "Token");
		const code = generateDamlModule(template);
		expect(code).not.toContain("template TokenAgreement");
	});
});

describe("generateDamlYaml", () => {
	it("contains sdk-version", () => {
		const yaml = generateDamlYaml("my-project", "3.4.0", ["Main"]);
		expect(yaml).toContain("sdk-version: 3.4.0");
	});

	it("contains project name", () => {
		const yaml = generateDamlYaml("my-project", "3.4.0", ["Main"]);
		expect(yaml).toContain("name: my-project");
	});

	it("contains version", () => {
		const yaml = generateDamlYaml("my-project", "3.4.0", ["Main"]);
		expect(yaml).toContain("version: 0.1.0");
	});

	it("contains daml dependencies", () => {
		const yaml = generateDamlYaml("p", "3.4.0", ["M"]);
		expect(yaml).toContain("daml-prim");
		expect(yaml).toContain("daml-stdlib");
		expect(yaml).toContain("daml-script");
	});

	it("contains init-script reference", () => {
		const yaml = generateDamlYaml("p", "3.4.0", ["M"]);
		expect(yaml).toContain("init-script: Setup:setup");
	});
});

describe("generateDamlScript", () => {
	it("declares test module with Test suffix", () => {
		const template = getPatternTemplate("asset", "TokenAsset", "Token");
		const script = generateDamlScript(template);
		expect(script).toContain("module TokenAssetTest where");
	});

	it("imports the source module", () => {
		const template = getPatternTemplate("asset", "TokenAsset", "Token");
		const script = generateDamlScript(template);
		expect(script).toContain("import TokenAsset");
	});

	it("contains allocateParty calls", () => {
		const template = getPatternTemplate("asset", "M", "Token");
		const script = generateDamlScript(template);
		expect(script).toContain("allocateParty");
	});

	it("contains createCmd with template name", () => {
		const template = getPatternTemplate("asset", "M", "Token");
		const script = generateDamlScript(template);
		expect(script).toContain("createCmd Token with");
	});

	it("contains exerciseCmd for first choice", () => {
		const template = getPatternTemplate("asset", "M", "Token");
		const script = generateDamlScript(template);
		expect(script).toContain("exerciseCmd cid Transfer");
	});

	it("allocates parties from choices params of type Party", () => {
		const template = getPatternTemplate("asset", "M", "Token");
		const script = generateDamlScript(template);
		// Transfer choice has newOwner: Party param
		expect(script).toContain("newOwner");
	});

	it("uses submit with first signatory for creation", () => {
		const template = getPatternTemplate("asset", "M", "Token");
		const script = generateDamlScript(template);
		expect(script).toContain("submit issuer $ createCmd");
	});
});
