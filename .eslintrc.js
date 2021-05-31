"use strict";

module.exports = {
  root: true,
  extends: "plugin:@phanect/plain",

  env: {
    browser: false,
    node: true,
  },

  parserOptions: {
    project: "./tsconfig.json",
  },
  plugins: [ "@phanect" ],
};
