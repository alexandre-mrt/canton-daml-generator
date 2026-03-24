import { describe, expect, it } from "vitest";
import {
	damlTypeToJsonApi,
	damlTypeToString,
	damlTypeToTypeScript,
} from "../daml-types.js";

describe("damlTypeToString", () => {
	it("converts primitive types as-is", () => {
		expect(damlTypeToString("Party")).toBe("Party");
		expect(damlTypeToString("Text")).toBe("Text");
		expect(damlTypeToString("Int")).toBe("Int");
		expect(damlTypeToString("Decimal")).toBe("Decimal");
		expect(damlTypeToString("Bool")).toBe("Bool");
		expect(damlTypeToString("Date")).toBe("Date");
		expect(damlTypeToString("Time")).toBe("Time");
	});

	it("wraps optional types", () => {
		expect(damlTypeToString({ optional: "Text" })).toBe("Optional Text");
		expect(damlTypeToString({ optional: "Party" })).toBe("Optional Party");
	});

	it("wraps list types with brackets", () => {
		expect(damlTypeToString({ list: "Text" })).toBe("[Text]");
		expect(damlTypeToString({ list: "Int" })).toBe("[Int]");
	});

	it("formats contractId types", () => {
		expect(damlTypeToString({ contractId: "MyTemplate" })).toBe(
			"ContractId MyTemplate",
		);
	});

	it("handles nested compound types", () => {
		expect(damlTypeToString({ optional: { list: "Text" } })).toBe(
			"Optional [Text]",
		);
		expect(damlTypeToString({ list: { optional: "Party" } })).toBe(
			"[Optional Party]",
		);
	});
});

describe("damlTypeToTypeScript", () => {
	it("maps Party to string", () => {
		expect(damlTypeToTypeScript("Party")).toBe("string");
	});

	it("maps Text to string", () => {
		expect(damlTypeToTypeScript("Text")).toBe("string");
	});

	it("maps Int to number", () => {
		expect(damlTypeToTypeScript("Int")).toBe("number");
	});

	it("maps Decimal to number", () => {
		expect(damlTypeToTypeScript("Decimal")).toBe("number");
	});

	it("maps Bool to boolean", () => {
		expect(damlTypeToTypeScript("Bool")).toBe("boolean");
	});

	it("maps Date and Time to string", () => {
		expect(damlTypeToTypeScript("Date")).toBe("string");
		expect(damlTypeToTypeScript("Time")).toBe("string");
	});

	it("maps ContractId to string", () => {
		expect(damlTypeToTypeScript("ContractId")).toBe("string");
	});

	it("maps optional types to union with null", () => {
		expect(damlTypeToTypeScript({ optional: "Text" })).toBe("string | null");
		expect(damlTypeToTypeScript({ optional: "Int" })).toBe("number | null");
	});

	it("maps list types to arrays", () => {
		expect(damlTypeToTypeScript({ list: "Text" })).toBe("string[]");
		expect(damlTypeToTypeScript({ list: "Decimal" })).toBe("number[]");
	});

	it("maps contractId compound to string", () => {
		expect(damlTypeToTypeScript({ contractId: "MyTemplate" })).toBe("string");
	});

	it("returns unknown for unmapped types", () => {
		expect(damlTypeToTypeScript("Optional" as never)).toBe("unknown");
	});
});

describe("damlTypeToJsonApi", () => {
	it("maps Party to string", () => {
		expect(damlTypeToJsonApi("Party")).toBe("string");
	});

	it("maps Int to string (numeric)", () => {
		expect(damlTypeToJsonApi("Int")).toBe("string (numeric)");
	});

	it("maps Decimal to string (numeric)", () => {
		expect(damlTypeToJsonApi("Decimal")).toBe("string (numeric)");
	});

	it("maps Bool to boolean", () => {
		expect(damlTypeToJsonApi("Bool")).toBe("boolean");
	});

	it("maps Date to formatted string", () => {
		expect(damlTypeToJsonApi("Date")).toBe("string (YYYY-MM-DD)");
	});

	it("maps Time to ISO 8601 string", () => {
		expect(damlTypeToJsonApi("Time")).toBe("string (ISO 8601)");
	});

	it("maps optional types to union with null", () => {
		expect(damlTypeToJsonApi({ optional: "Text" })).toBe("string | null");
	});

	it("maps list types to arrays", () => {
		expect(damlTypeToJsonApi({ list: "Int" })).toBe("string (numeric)[]");
	});

	it("maps contractId compound to string", () => {
		expect(damlTypeToJsonApi({ contractId: "Foo" })).toBe("string");
	});

	it("returns unknown for unmapped types", () => {
		expect(damlTypeToJsonApi("Optional" as never)).toBe("unknown");
	});
});
