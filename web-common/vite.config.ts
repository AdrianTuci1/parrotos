import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import type { Alias } from "vite";
import { svelteTesting } from "@testing-library/svelte/vite";

const alias: Alias[] = [
  {
    find: "src",
    replacement: "/src",
  },
  {
    // Must precede the generic `@rilldata/web-common` alias below: Vite resolves
    // aliases in order, and the generic one would otherwise capture the generated
    // i18n module path before the specific stub can match.
    find: "@rilldata/web-common/lib/i18n/gen/messages",
    replacement: "/../web-common/tests/i18n-messages.mock.ts",
  },
  {
    find: "@rilldata/web-common",
    replacement: "/../web-common/src",
  },
];

export default defineConfig(({ mode }) => {
  if (mode === "test") {
    alias.push({
      find: "$app/environment",
      replacement: "/../web-common/tests/app-environment.mock.ts",
    });
    // canvas-entity dynamically imports the admin client only in the cloud context; stub
    // it so web-common unit tests that pull in canvas-entity can resolve the import graph.
    alias.push({
      find: "@rilldata/web-admin/client",
      replacement: "/../web-common/tests/web-admin-client.mock.ts",
    });
  }

  return {
    resolve: {
      alias,
    },
    // The React port components live as .tsx alongside the Svelte sources. Enable
    // the automatic JSX runtime so vitest can compile them; the `/test` project
    // below is the only consumer, the Svelte build is unaffected.
    esbuild: {
      jsx: "automatic",
    },
    plugins: [sveltekit()],
    test: {
      projects: [
        {
          extends: "./vite.config.ts",
          plugins: [svelteTesting()],
          test: {
            name: "client",
            environment: "jsdom",
            clearMocks: true,
            setupFiles: ["./vitest-setup.ts"],
            globals: true,
            coverage: {
              provider: "v8",
              include: ["src/**"],
            },
          },
        },
      ],
    },
  };
});
