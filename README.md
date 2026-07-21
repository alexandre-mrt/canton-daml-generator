# Canton Daml Generator

CLI tool to scaffold **Daml smart contracts** for the Canton Network with TypeScript integration.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![Canton](https://img.shields.io/badge/Canton-Network-0052ff)
![License](https://img.shields.io/badge/License-MIT-green)

## Why?

Building on Canton Network requires writing Daml smart contracts, test scripts, and TypeScript integration code. This generator:

1. **Scaffolds Daml contracts** from 9 common patterns (asset, IOU, escrow, auction...)
2. **Generates TypeScript types** matching your Daml templates
3. **Creates JSON API clients** for each contract with full type safety
4. **Generates test scripts** (Daml Script) for automated testing

Save hours of boilerplate. Focus on business logic.

## Quick Start

```bash
# Install
bun add -g canton-daml-generator

# Generate an asset tokenization contract
daml-gen generate --pattern asset --name TokenizedBond --module Bonds

# Generate an escrow contract with TypeScript
daml-gen generate --pattern escrow --name TradeEscrow --typescript

# List all available patterns
daml-gen list

# Preview without writing files
daml-gen preview --pattern subscription
```

## Available Patterns

| Pattern | Description | Fields | Choices |
|---------|-------------|--------|---------|
| `asset` | Tokenized asset with Transfer, Split, Merge (CIP-56 inspired) | 6 | 3 |
| `iou` | I Owe You with Transfer and Settle | 5 | 2 |
| `proposal` | Propose-Accept pattern for multi-party agreements | 4 | 3 |
| `role` | Role-based authorization with permission management | 4 | 3 |
| `registry` | Named entry registry (domains, credentials) | 5 | 3 |
| `escrow` | Escrow with Release, Refund, and Dispute | 6 | 3 |
| `auction` | Simple auction with bidding and settlement | 6 | 3 |
| `subscription` | Subscription/licensing (Canton Quickstart pattern) | 8 | 4 |
| `custom` | Minimal scaffold for custom contracts | 2 | 1 |

## Generated Files

For each pattern, the generator creates:

```
my-project/
  daml.yaml                          # Daml project config
  daml/
    MyModule.daml                    # Smart contract
    MyModuleTest.daml                # Test script
  typescript/
    mytemplate.types.ts              # TypeScript interfaces
    mytemplate.client.ts             # JSON API client
```

## Example: Asset Pattern

### Generated Daml

```daml
template TokenizedBond
  with
    issuer : Party
    owner : Party
    name : Text
    symbol : Text
    amount : Decimal
    metadata : Text
  where
    signatory issuer
    observer owner
    ensure amount > 0.0
    key (issuer, symbol, owner) : (Party, Text, Party)
    maintainer key._1

    choice Transfer : ContractId TokenizedBond
      with
        newOwner : Party
      controller owner
        do
          create this with owner = newOwner

    choice Split : (ContractId TokenizedBond, ContractId TokenizedBond)
      with
        splitAmount : Decimal
      controller owner
        do
          assert (splitAmount > 0.0 && splitAmount < amount)
          cid1 <- create this with amount = splitAmount
          cid2 <- create this with amount = amount - splitAmount
          return (cid1, cid2)
```

### Generated TypeScript

```typescript
export interface TokenizedBond {
  issuer: string;
  owner: string;
  name: string;
  symbol: string;
  amount: number;
  metadata: string;
}

export interface TransferArgs {
  newOwner: string;
}

export class TokenizedBondClient {
  async create(payload: TokenizedBond): Promise<TokenizedBondContractId> { ... }
  async query(filter?: Partial<TokenizedBond>): Promise<TokenizedBondContract[]> { ... }
  async exerciseTransfer(contractId: TokenizedBondContractId, args: TransferArgs): Promise<unknown> { ... }
  async exerciseSplit(contractId: TokenizedBondContractId, args: SplitArgs): Promise<unknown> { ... }
}
```

## CLI Reference

### `generate` (alias: `gen`)

```
daml-gen generate [options]

Options:
  -p, --pattern <pattern>       Contract pattern (required)
  -n, --name <name>             Template name, PascalCase (default: "MyContract")
  -m, --module <module>         Daml module name (default: same as name)
  -o, --output <dir>            Output directory (default: ".")
  --project-name <name>         Project name for daml.yaml (default: "my-canton-app")
  --typescript / --no-typescript Generate TypeScript (default: true)
  --tests / --no-tests          Generate tests (default: true)
  --overwrite                   Overwrite existing files (default: false)
```

### `list`

List all available contract patterns with descriptions.

### `preview`

Preview generated Daml code without writing to disk.

```
daml-gen preview -p <pattern> [-n <name>] [-m <module>]
```

## Grant Eligibility

This tool is built as a **developer tool** for the Canton ecosystem and is intended to fit the Developer Tools scope of the [Canton Foundation Grants Program](https://canton.foundation/grants-program/):

- **Category:** Developer Tools
- **Focus:** Accelerating Canton app development, reducing onboarding friction
- **How to apply:** Submit a PR to [canton-foundation/canton-dev-fund](https://github.com/canton-foundation/canton-dev-fund)

## Contributing

PRs welcome. Run `bun install`, then `bun run test` and `bun run type-check` before opening a PR. Formatting/linting is handled by Biome (`bun run lint`).

## License

MIT

---

Built for the Canton ecosystem. Not affiliated with Digital Asset.
