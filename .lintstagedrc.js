const path = require("path");

const buildNextEslintCommand = (filenames) =>
  `yarn frontend:lint --fix --file ${filenames
    .map((f) => path.relative(path.join("packages", "frontend"), f))
    .join(" --file ")}`;

const checkTypesNextCommand = () => "yarn frontend:check-types";

const buildContractsEslintCommand = (filenames) =>
  `yarn contracts:lint-staged --fix ${filenames
    .map((f) => path.relative(path.join("packages", "contracts"), f))
    .join(" ")}`;

module.exports = {
  "packages/frontend/**/*.{ts,tsx}": [
    buildNextEslintCommand,
    checkTypesNextCommand,
  ],
  "packages/contracts/**/*.{ts,tsx}": [buildContractsEslintCommand],
};
