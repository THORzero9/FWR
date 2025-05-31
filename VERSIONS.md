# Environment Versions

This document records the versions of Node.js, npm, and PostgreSQL used during the dependency update process.

* **Node.js:** v18.19.1
* **npm:** 9.2.0
* **PostgreSQL:** Not installed or not found in PATH.

**Note:** The project's dependencies were updated on 2024-05-25. Please refer to `package.json` and `package-lock.json` for the exact versions of the installed npm packages.
Potential compatibility issues:
* Radix UI components (`@radix-ui/*`) were not updated to their absolute latest versions due to peer dependency conflicts with `@types/react@^19.0.0`. They are currently at versions compatible with `@types/react@^18.0.0`. Using `--legacy-peer-deps` was necessary to update `react` and `react-dom` to v19.
* The `esbuild` vulnerabilities remain as fixing them would require downgrading `drizzle-kit` to an older version.
