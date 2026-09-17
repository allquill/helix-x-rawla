import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  /*
   * `@helix-x/core-sdk` must stay external. Bundling it would put a second
   * copy of the OpenAPI singleton inside this package, so plugin-auth would
   * configure one object and every request here would read the other.
   */
  external: ['axios', 'form-data', '@helix-x/core-sdk'],
});
