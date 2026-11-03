// WatermelonDB's @field/@children/@date/@json decorators (src/lib/database.ts)
// are legacy-style decorators (TC39 stage-1), not the stage-3 decorators
// Babel/TypeScript default to today. Without this, `@babel/plugin-transform-typescript`
// treats `branchId!: string` as a plain declared class field under the new
// semantics, which collides with the definite-assignment assertion (`!`) —
// "Definitely assigned fields cannot be initialized here, but only in the
// constructor." Required explicitly since there is no default babel.config.js
// from Expo that enables this.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["@babel/plugin-proposal-decorators", { legacy: true }],
      ["@babel/plugin-transform-class-properties", { loose: true }],
    ],
  };
};
