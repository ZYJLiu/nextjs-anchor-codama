# Solana Anchor Template

A full-stack Solana development template:

- Anchor Program
- Codama generated Rust and Typescript program clients
- Mollusk and Litesvm for program tests in Rust
- Nextjs frontend with Solana Kit

## Prerequisites

- Node.js
- pnpm
- Rust
- Solana CLI
- Anchor CLI

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development (builds, tests, deploys, and runs frontend)
pnpm start
```

## Project Structure

```
.
├── programs/          # Anchor program
├── frontend/          # Next.js frontend with Solana Kit
├── clients/           # Generated Codama TypeScript and Rust clients
├── tests/             # Program tests with Mollusk and Litesvm
└── scripts/           # Utility scripts for airdropping devnet SOL
```

## Commands

### Development

- `pnpm start` - Complete flow (airdrop, build, test, deploy, start dev server)

### Program

- `pnpm build:program` - Build Anchor program
- `pnpm generate` - Generate client SDKs with Codama
- `pnpm test` - Run program tests
- `pnpm deploy:program` - Deploy to devnet

### Frontend

- `pnpm dev` - Start frontend dev server

## Configuration

- `Anchor.toml` - Anchor configuration
- `codama.json` - Codama Client SDK generation config
- `frontend/` - Next.js app with wallet integration using Solana Kit

## Development Workflow

1. Update program in `programs/anchor_program/src/lib.rs`
2. Run `pnpm build:program` to build program and generate codama clients
3. Run `pnpm test` to run tests
4. Run `pnpm deploy:program` to deploy to devnet
5. Update frontend in `frontend/` to using generated codama TS client

## Testing

- Located in `tests/` using LiteSVM and Mollusk

## Deployment

The template is configured for devnet by default.
