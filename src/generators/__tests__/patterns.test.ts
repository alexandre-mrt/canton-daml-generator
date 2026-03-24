import { describe, expect, it } from "vitest";
import type { TemplatePattern } from "../../types.js";
import { getPatternTemplate } from "../patterns.js";

const ALL_PATTERNS: TemplatePattern[] = [
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

describe("getPatternTemplate", () => {
	for (const pattern of ALL_PATTERNS) {
		describe(`${pattern} pattern`, () => {
			const template = getPatternTemplate(pattern, "TestModule", "TestTemplate");

			it("returns correct moduleName and templateName", () => {
				expect(template.moduleName).toBe("TestModule");
				expect(template.templateName).toBe("TestTemplate");
			});

			it("has at least one field", () => {
				expect(template.fields.length).toBeGreaterThan(0);
			});

			it("has at least one signatory", () => {
				expect(template.signatories.length).toBeGreaterThan(0);
			});

			it("has at least one choice", () => {
				expect(template.choices.length).toBeGreaterThan(0);
			});

			it("all fields have name and type", () => {
				for (const field of template.fields) {
					expect(field.name).toBeTruthy();
					expect(field.type).toBeTruthy();
				}
			});

			it("all choices have name, controller, and returnType", () => {
				for (const choice of template.choices) {
					expect(choice.name).toBeTruthy();
					expect(choice.controller).toBeTruthy();
					expect(choice.returnType).toBeTruthy();
					expect(typeof choice.consuming).toBe("boolean");
				}
			});
		});
	}

	it("asset pattern has Transfer, Split, and Merge choices", () => {
		const template = getPatternTemplate("asset", "M", "Asset");
		const choiceNames = template.choices.map((c) => c.name);
		expect(choiceNames).toContain("Transfer");
		expect(choiceNames).toContain("Split");
		expect(choiceNames).toContain("Merge");
	});

	it("proposal pattern has Accept, Reject, and Withdraw choices", () => {
		const template = getPatternTemplate("proposal", "M", "Prop");
		const choiceNames = template.choices.map((c) => c.name);
		expect(choiceNames).toContain("Accept");
		expect(choiceNames).toContain("Reject");
		expect(choiceNames).toContain("Withdraw");
	});

	it("escrow pattern has Release, Refund, and Dispute choices", () => {
		const template = getPatternTemplate("escrow", "M", "Escrow");
		const choiceNames = template.choices.map((c) => c.name);
		expect(choiceNames).toContain("Release");
		expect(choiceNames).toContain("Refund");
		expect(choiceNames).toContain("Dispute");
	});

	it("escrow Dispute choice is nonconsuming", () => {
		const template = getPatternTemplate("escrow", "M", "Escrow");
		const dispute = template.choices.find((c) => c.name === "Dispute");
		expect(dispute?.consuming).toBe(false);
	});

	it("asset pattern includes a key definition", () => {
		const template = getPatternTemplate("asset", "M", "Asset");
		expect(template.key).toBeDefined();
		expect(template.key?.maintainer).toBeTruthy();
	});

	it("asset pattern has an ensure clause", () => {
		const template = getPatternTemplate("asset", "M", "Asset");
		expect(template.ensure).toBeDefined();
	});

	it("role pattern uses list type for permissions field", () => {
		const template = getPatternTemplate("role", "M", "Role");
		const permissions = template.fields.find((f) => f.name === "permissions");
		expect(permissions?.type).toEqual({ list: "Text" });
	});

	it("registry pattern uses optional type for expiresAt field", () => {
		const template = getPatternTemplate("registry", "M", "Reg");
		const expiresAt = template.fields.find((f) => f.name === "expiresAt");
		expect(expiresAt?.type).toEqual({ optional: "Time" });
	});

	it("auction pattern uses optional type for highestBidder field", () => {
		const template = getPatternTemplate("auction", "M", "Auction");
		const bidder = template.fields.find((f) => f.name === "highestBidder");
		expect(bidder?.type).toEqual({ optional: "Party" });
	});

	it("oracle pattern has UpdatePrice and QueryPrice choices", () => {
		const template = getPatternTemplate("oracle", "M", "Oracle");
		const choiceNames = template.choices.map((c) => c.name);
		expect(choiceNames).toContain("UpdatePrice");
		expect(choiceNames).toContain("QueryPrice");
	});

	it("oracle QueryPrice choice is nonconsuming", () => {
		const template = getPatternTemplate("oracle", "M", "Oracle");
		const query = template.choices.find((c) => c.name === "QueryPrice");
		expect(query?.consuming).toBe(false);
	});

	it("oracle pattern has price field of type Decimal", () => {
		const template = getPatternTemplate("oracle", "M", "Oracle");
		const price = template.fields.find((f) => f.name === "price");
		expect(price?.type).toBe("Decimal");
	});

	it("oracle pattern includes a key definition", () => {
		const template = getPatternTemplate("oracle", "M", "Oracle");
		expect(template.key).toBeDefined();
		expect(template.key?.maintainer).toBeTruthy();
	});

	it("token pattern has Transfer, Burn, Mint, and Split choices", () => {
		const template = getPatternTemplate("token", "M", "Token");
		const choiceNames = template.choices.map((c) => c.name);
		expect(choiceNames).toContain("Transfer");
		expect(choiceNames).toContain("Burn");
		expect(choiceNames).toContain("Mint");
		expect(choiceNames).toContain("Split");
	});

	it("token pattern has amount field of type Decimal", () => {
		const template = getPatternTemplate("token", "M", "Token");
		const amount = template.fields.find((f) => f.name === "amount");
		expect(amount?.type).toBe("Decimal");
	});

	it("token pattern has decimals field of type Int", () => {
		const template = getPatternTemplate("token", "M", "Token");
		const decimals = template.fields.find((f) => f.name === "decimals");
		expect(decimals?.type).toBe("Int");
	});

	it("token pattern includes a key definition", () => {
		const template = getPatternTemplate("token", "M", "Token");
		expect(template.key).toBeDefined();
		expect(template.key?.maintainer).toBeTruthy();
	});

	it("token pattern has an ensure clause", () => {
		const template = getPatternTemplate("token", "M", "Token");
		expect(template.ensure).toBeDefined();
	});
});
