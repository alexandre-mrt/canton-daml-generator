import { describe, expect, it } from "vitest";
import {
	generateTypeScriptClient,
	generateTypeScriptTypes,
} from "../typescript-generator.js";
import { getPatternTemplate } from "../patterns.js";

describe("generateTypeScriptTypes", () => {
	const template = getPatternTemplate("asset", "TokenAsset", "Token");
	const code = generateTypeScriptTypes(template);

	it("produces an interface with the template name", () => {
		expect(code).toContain("export interface Token {");
	});

	it("includes all fields with TypeScript types", () => {
		expect(code).toContain("issuer: string;");
		expect(code).toContain("owner: string;");
		expect(code).toContain("name: string;");
		expect(code).toContain("amount: number;");
	});

	it("generates choice argument interfaces", () => {
		expect(code).toContain("export interface TransferArgs {");
		expect(code).toContain("newOwner: string;");
		expect(code).toContain("export interface SplitArgs {");
		expect(code).toContain("splitAmount: number;");
	});

	it("generates branded ContractId type", () => {
		expect(code).toContain(
			'export type TokenContractId = string & { __brand: "Token" };',
		);
	});

	it("generates Contract interface with contractId and payload", () => {
		expect(code).toContain("export interface TokenContract {");
		expect(code).toContain("contractId: TokenContractId;");
		expect(code).toContain("payload: Token;");
	});

	it("includes field descriptions as JSDoc comments", () => {
		expect(code).toContain("/** Asset issuer */");
		expect(code).toContain("/** Current owner */");
	});

	it("handles optional types correctly", () => {
		const auctionTemplate = getPatternTemplate("auction", "M", "Auction");
		const auctionCode = generateTypeScriptTypes(auctionTemplate);
		expect(auctionCode).toContain("highestBidder: string | null;");
	});

	it("handles list types correctly", () => {
		const roleTemplate = getPatternTemplate("role", "M", "Role");
		const roleCode = generateTypeScriptTypes(roleTemplate);
		expect(roleCode).toContain("permissions: string[];");
	});
});

describe("generateTypeScriptClient", () => {
	const template = getPatternTemplate("asset", "TokenAsset", "Token");
	const code = generateTypeScriptClient(template);

	it("defines PACKAGE_ID before TEMPLATE_ID", () => {
		const packageIdIdx = code.indexOf("PACKAGE_ID");
		const templateIdIdx = code.indexOf("TEMPLATE_ID");
		expect(packageIdIdx).toBeLessThan(templateIdIdx);
		expect(packageIdIdx).toBeGreaterThan(-1);
	});

	it("defines MODULE_NAME and TEMPLATE_NAME", () => {
		expect(code).toContain('const MODULE_NAME = "TokenAsset";');
		expect(code).toContain('const TEMPLATE_NAME = "Token";');
	});

	it("generates a client class", () => {
		expect(code).toContain("export class TokenClient {");
	});

	it("has a create method", () => {
		expect(code).toContain("async create(payload: Token)");
	});

	it("has a query method", () => {
		expect(code).toContain("async query(filter?: Partial<Token>)");
	});

	it("has exercise methods for each choice", () => {
		expect(code).toContain("async exerciseTransfer(");
		expect(code).toContain("async exerciseSplit(");
		expect(code).toContain("async exerciseMerge(");
	});

	it("imports types from the types file", () => {
		expect(code).toContain('from "./token.types"');
		expect(code).toContain("Token,");
		expect(code).toContain("TokenContract,");
		expect(code).toContain("TokenContractId");
	});

	it("imports choice arg types", () => {
		expect(code).toContain("TransferArgs");
		expect(code).toContain("SplitArgs");
		expect(code).toContain("MergeArgs");
	});

	it("uses POST requests to JSON API v2 endpoints", () => {
		expect(code).toContain('"/v2/create"');
		expect(code).toContain('"/v2/query"');
		expect(code).toContain('"/v2/exercise"');
	});

	it("includes authorization header", () => {
		expect(code).toContain("Authorization: `Bearer ${this.config.token}`");
	});
});
