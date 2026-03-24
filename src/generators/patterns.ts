import type { DamlTemplate, TemplatePattern } from "../types.js";

export function getPatternTemplate(
	pattern: TemplatePattern,
	moduleName: string,
	templateName: string,
): DamlTemplate {
	const patterns: Record<TemplatePattern, () => DamlTemplate> = {
		asset: () => createAssetTemplate(moduleName, templateName),
		iou: () => createIouTemplate(moduleName, templateName),
		proposal: () => createProposalTemplate(moduleName, templateName),
		role: () => createRoleTemplate(moduleName, templateName),
		registry: () => createRegistryTemplate(moduleName, templateName),
		escrow: () => createEscrowTemplate(moduleName, templateName),
		auction: () => createAuctionTemplate(moduleName, templateName),
		subscription: () => createSubscriptionTemplate(moduleName, templateName),
		custom: () => createCustomTemplate(moduleName, templateName),
	};

	return patterns[pattern]();
}

function createAssetTemplate(
	moduleName: string,
	templateName: string,
): DamlTemplate {
	return {
		moduleName,
		templateName,
		description: "Tokenized asset with transfer and split capabilities (CIP-56 inspired)",
		fields: [
			{ name: "issuer", type: "Party", description: "Asset issuer" },
			{ name: "owner", type: "Party", description: "Current owner" },
			{ name: "name", type: "Text", description: "Asset name" },
			{ name: "symbol", type: "Text", description: "Asset symbol" },
			{ name: "amount", type: "Decimal", description: "Amount of the asset" },
			{ name: "metadata", type: "Text", description: "JSON metadata" },
		],
		signatories: ["issuer"],
		observers: ["owner"],
		choices: [
			{
				name: "Transfer",
				consuming: true,
				controller: "owner",
				params: [{ name: "newOwner", type: "Party" }],
				returnType: `ContractId ${templateName}`,
				description: "Transfer asset to a new owner",
				body: `create this with owner = newOwner`,
			},
			{
				name: "Split",
				consuming: true,
				controller: "owner",
				params: [{ name: "splitAmount", type: "Decimal" }],
				returnType: `(ContractId ${templateName}, ContractId ${templateName})`,
				description: "Split asset into two parts",
				body: `do
        assert (splitAmount > 0.0 && splitAmount < amount)
        cid1 <- create this with amount = splitAmount
        cid2 <- create this with amount = amount - splitAmount
        return (cid1, cid2)`,
			},
			{
				name: "Merge",
				consuming: true,
				controller: "owner",
				params: [{ name: "otherCid", type: { contractId: templateName } }],
				returnType: `ContractId ${templateName}`,
				description: "Merge with another asset contract",
				body: `do
        other <- fetch otherCid
        assert (other.issuer == issuer && other.owner == owner && other.symbol == symbol)
        archive otherCid
        create this with amount = amount + other.amount`,
			},
		],
		ensure: "amount > 0.0",
		key: {
			type: "(Party, Text, Party)",
			expression: "(issuer, symbol, owner)",
			maintainer: "key._1",
		},
	};
}

function createIouTemplate(
	moduleName: string,
	templateName: string,
): DamlTemplate {
	return {
		moduleName,
		templateName,
		description: "IOU (I Owe You) contract with settle and transfer",
		fields: [
			{ name: "obligor", type: "Party", description: "Party who owes" },
			{ name: "owner", type: "Party", description: "Party who is owed" },
			{ name: "currency", type: "Text", description: "Currency code" },
			{ name: "amount", type: "Decimal", description: "Amount owed" },
			{ name: "description", type: "Text", description: "IOU description" },
		],
		signatories: ["obligor"],
		observers: ["owner"],
		choices: [
			{
				name: "Transfer",
				consuming: true,
				controller: "owner",
				params: [{ name: "newOwner", type: "Party" }],
				returnType: `ContractId ${templateName}`,
				description: "Transfer IOU to a new owner",
				body: "create this with owner = newOwner",
			},
			{
				name: "Settle",
				consuming: true,
				controller: "obligor",
				params: [],
				returnType: "()",
				description: "Settle the IOU (archive it)",
				body: "return ()",
			},
		],
		ensure: "amount > 0.0",
	};
}

function createProposalTemplate(
	moduleName: string,
	templateName: string,
): DamlTemplate {
	return {
		moduleName,
		templateName,
		description: "Propose-Accept pattern for multi-party agreements",
		fields: [
			{ name: "proposer", type: "Party" },
			{ name: "accepter", type: "Party" },
			{ name: "proposal", type: "Text", description: "Proposal details" },
			{ name: "terms", type: "Text", description: "Agreement terms" },
		],
		signatories: ["proposer"],
		observers: ["accepter"],
		choices: [
			{
				name: "Accept",
				consuming: true,
				controller: "accepter",
				params: [],
				returnType: `ContractId ${templateName}Agreement`,
				description: "Accept the proposal, creating a binding agreement",
				body: `create ${templateName}Agreement with proposer, accepter, terms`,
			},
			{
				name: "Reject",
				consuming: true,
				controller: "accepter",
				params: [{ name: "reason", type: "Text" }],
				returnType: "()",
				description: "Reject the proposal",
				body: "return ()",
			},
			{
				name: "Withdraw",
				consuming: true,
				controller: "proposer",
				params: [],
				returnType: "()",
				description: "Withdraw the proposal",
				body: "return ()",
			},
		],
	};
}

function createRoleTemplate(
	moduleName: string,
	templateName: string,
): DamlTemplate {
	return {
		moduleName,
		templateName,
		description: "Role-based authorization contract for ongoing permissions",
		fields: [
			{ name: "admin", type: "Party", description: "Role administrator" },
			{ name: "user", type: "Party", description: "Role holder" },
			{ name: "roleName", type: "Text", description: "Name of the role" },
			{ name: "permissions", type: { list: "Text" }, description: "List of permissions" },
		],
		signatories: ["admin"],
		observers: ["user"],
		choices: [
			{
				name: "GrantPermission",
				consuming: true,
				controller: "admin",
				params: [{ name: "permission", type: "Text" }],
				returnType: `ContractId ${templateName}`,
				description: "Add a permission to this role",
				body: "create this with permissions = permission :: permissions",
			},
			{
				name: "RevokePermission",
				consuming: true,
				controller: "admin",
				params: [{ name: "permission", type: "Text" }],
				returnType: `ContractId ${templateName}`,
				description: "Remove a permission from this role",
				body: `create this with permissions = filter (\\p -> p /= permission) permissions`,
			},
			{
				name: "RevokeRole",
				consuming: true,
				controller: "admin",
				params: [],
				returnType: "()",
				description: "Completely revoke this role",
				body: "return ()",
			},
		],
		key: {
			type: "(Party, Party, Text)",
			expression: "(admin, user, roleName)",
			maintainer: "key._1",
		},
	};
}

function createRegistryTemplate(
	moduleName: string,
	templateName: string,
): DamlTemplate {
	return {
		moduleName,
		templateName,
		description: "Registry contract for managing named entries (e.g., domain names, credentials)",
		fields: [
			{ name: "registrar", type: "Party" },
			{ name: "owner", type: "Party" },
			{ name: "entryName", type: "Text" },
			{ name: "entryValue", type: "Text" },
			{ name: "expiresAt", type: { optional: "Time" } },
		],
		signatories: ["registrar"],
		observers: ["owner"],
		choices: [
			{
				name: "UpdateValue",
				consuming: true,
				controller: "owner",
				params: [{ name: "newValue", type: "Text" }],
				returnType: `ContractId ${templateName}`,
				body: "create this with entryValue = newValue",
			},
			{
				name: "TransferOwnership",
				consuming: true,
				controller: "owner",
				params: [{ name: "newOwner", type: "Party" }],
				returnType: `ContractId ${templateName}`,
				body: "create this with owner = newOwner",
			},
			{
				name: "Revoke",
				consuming: true,
				controller: "registrar",
				params: [],
				returnType: "()",
				body: "return ()",
			},
		],
		key: {
			type: "(Party, Text)",
			expression: "(registrar, entryName)",
			maintainer: "key._1",
		},
	};
}

function createEscrowTemplate(
	moduleName: string,
	templateName: string,
): DamlTemplate {
	return {
		moduleName,
		templateName,
		description: "Escrow contract with release and refund conditions",
		fields: [
			{ name: "payer", type: "Party" },
			{ name: "payee", type: "Party" },
			{ name: "escrowAgent", type: "Party" },
			{ name: "amount", type: "Decimal" },
			{ name: "currency", type: "Text" },
			{ name: "condition", type: "Text" },
		],
		signatories: ["payer", "escrowAgent"],
		observers: ["payee"],
		choices: [
			{
				name: "Release",
				consuming: true,
				controller: "escrowAgent",
				params: [],
				returnType: "()",
				description: "Release funds to payee",
				body: "return ()",
			},
			{
				name: "Refund",
				consuming: true,
				controller: "escrowAgent",
				params: [{ name: "reason", type: "Text" }],
				returnType: "()",
				description: "Refund to payer",
				body: "return ()",
			},
			{
				name: "Dispute",
				consuming: false,
				controller: "payee",
				params: [{ name: "disputeReason", type: "Text" }],
				returnType: "()",
				description: "Raise a dispute",
				body: "return ()",
			},
		],
		ensure: "amount > 0.0",
	};
}

function createAuctionTemplate(
	moduleName: string,
	templateName: string,
): DamlTemplate {
	return {
		moduleName,
		templateName,
		description: "Simple auction contract with bidding and settlement",
		fields: [
			{ name: "seller", type: "Party" },
			{ name: "itemName", type: "Text" },
			{ name: "itemDescription", type: "Text" },
			{ name: "minimumBid", type: "Decimal" },
			{ name: "highestBid", type: "Decimal" },
			{ name: "highestBidder", type: { optional: "Party" } },
		],
		signatories: ["seller"],
		observers: [],
		choices: [
			{
				name: "PlaceBid",
				consuming: true,
				controller: "seller",
				params: [
					{ name: "bidder", type: "Party" },
					{ name: "bidAmount", type: "Decimal" },
				],
				returnType: `ContractId ${templateName}`,
				description: "Place a bid (must be higher than current highest)",
				body: `do
        assert (bidAmount > highestBid)
        create this with highestBid = bidAmount, highestBidder = Some bidder`,
			},
			{
				name: "Settle",
				consuming: true,
				controller: "seller",
				params: [],
				returnType: "()",
				description: "Settle the auction (end and award to highest bidder)",
				body: "return ()",
			},
			{
				name: "Cancel",
				consuming: true,
				controller: "seller",
				params: [],
				returnType: "()",
				description: "Cancel the auction",
				body: "return ()",
			},
		],
		ensure: "minimumBid > 0.0",
	};
}

function createSubscriptionTemplate(
	moduleName: string,
	templateName: string,
): DamlTemplate {
	return {
		moduleName,
		templateName,
		description: "Subscription/licensing contract (Canton Quickstart pattern)",
		fields: [
			{ name: "provider", type: "Party" },
			{ name: "subscriber", type: "Party" },
			{ name: "serviceName", type: "Text" },
			{ name: "fee", type: "Decimal" },
			{ name: "currency", type: "Text" },
			{ name: "startDate", type: "Date" },
			{ name: "endDate", type: "Date" },
			{ name: "active", type: "Bool" },
		],
		signatories: ["provider"],
		observers: ["subscriber"],
		choices: [
			{
				name: "Renew",
				consuming: true,
				controller: "subscriber",
				params: [{ name: "newEndDate", type: "Date" }],
				returnType: `ContractId ${templateName}`,
				description: "Renew the subscription",
				body: "create this with endDate = newEndDate",
			},
			{
				name: "Cancel",
				consuming: true,
				controller: "subscriber",
				params: [],
				returnType: "()",
				description: "Cancel the subscription",
				body: "return ()",
			},
			{
				name: "Suspend",
				consuming: true,
				controller: "provider",
				params: [],
				returnType: `ContractId ${templateName}`,
				description: "Suspend the subscription",
				body: "create this with active = False",
			},
			{
				name: "Reactivate",
				consuming: true,
				controller: "provider",
				params: [],
				returnType: `ContractId ${templateName}`,
				description: "Reactivate a suspended subscription",
				body: "create this with active = True",
			},
		],
		ensure: "fee > 0.0",
	};
}

function createCustomTemplate(
	moduleName: string,
	templateName: string,
): DamlTemplate {
	return {
		moduleName,
		templateName,
		description: "Custom template scaffold",
		fields: [
			{ name: "owner", type: "Party" },
			{ name: "data", type: "Text" },
		],
		signatories: ["owner"],
		observers: [],
		choices: [
			{
				name: "Update",
				consuming: true,
				controller: "owner",
				params: [{ name: "newData", type: "Text" }],
				returnType: `ContractId ${templateName}`,
				body: "create this with data = newData",
			},
		],
	};
}
