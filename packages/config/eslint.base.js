/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: false,
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  env: {
    es2022: true,
    node: true,
  },
};
