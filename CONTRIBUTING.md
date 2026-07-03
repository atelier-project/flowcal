# Contributing to FlowCal

Thanks for your interest in improving FlowCal! This project is open source under
the [Apache License 2.0](LICENSE), and contributions of all kinds are welcome —
bug fixes, node types, docs, and features.

## Ground rules

- **Be respectful.** Assume good intent; keep discussion constructive.
- **Open an issue first** for anything non-trivial, so we can agree on the
  approach before you invest time. Small fixes can go straight to a PR.
- **One logical change per PR.** Easier to review, easier to revert.

## Developer Certificate of Origin (DCO)

We use the [DCO](https://developercertificate.org/) instead of a CLA. It's a
lightweight statement that you have the right to submit your contribution under
the project's license. **Sign off every commit** by adding a `Signed-off-by`
line — git does this for you with:

```bash
git commit -s -m "your message"
```

which appends:

```
Signed-off-by: Your Name <your.email@example.com>
```

PRs whose commits aren't signed off will be asked to amend (`git rebase --signoff`).

## Development setup

See the [README](README.md) for full instructions. In short:

```bash
npm install
cp .env.example .env      # choose VITE_BACKEND and set the matching vars
npm run dev               # http://localhost:5173
```

For the self-hosted backend, see [`server/README.md`](server/README.md).

## Before you open a PR

Please make sure these pass:

```bash
npm run lint
npm run test:run
npm run build
```

- **Match the surrounding style** — the codebase is JSX (no TypeScript), Tailwind
  for styling, and small, focused modules.
- **Add tests** for engine/logic changes (`src/engine`, `src/utils`) and, where
  practical, for editor behaviour.
- **Adding a node type?** It touches five places — `NODE_LOGIC`
  (`src/engine/nodeDefinitions.js`), `NODE_DESCRIPTIONS`
  (`src/engine/nodeDescriptions.js`), `NODE_UI` (`src/components/flow/nodeUIMap.js`),
  the body renderer in `src/components/flow/Node.jsx`, and (for dynamic ports)
  `src/components/flow/node/NodeHandles.jsx`. Keep handle positions in sync with
  `src/utils/handlePositions.js` and `src/utils/geometry.js`.

## Relationship to Atelier

FlowCal is fully open source and runs anywhere. [Atelier](https://tryatelier.dev/)
is a separate commercial platform that offers first-class hosting. Contributions
here are to the open project; see [`docs/POSITIONING.md`](docs/POSITIONING.md).

By contributing, you agree that your contributions are licensed under Apache-2.0.
