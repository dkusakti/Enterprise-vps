# Dependency Security Note

- `qs` has been pinned to `6.16.0`.
- `package.json` contains an npm `overrides` rule: `qs: 6.16.0`.
- The previous vulnerable range reported by npm audit was `2.2.5 - 6.15.3`.
- The ZIP intentionally excludes `node_modules/` and `.env`. Install dependencies and provide production secrets through your deployment environment.
- Local validation performed on this build:
  - 52 JavaScript files passed `node --check`.
  - Security regression suite: 9/9 passed.
  - `npm install --package-lock-only --offline --ignore-scripts`: 0 vulnerabilities reported by npm's local package tree resolution.
- A live `npm audit` requires access to the npm registry. The audit endpoint was unavailable from the build environment during final packaging.
