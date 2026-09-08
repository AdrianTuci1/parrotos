import { rillDev } from "@statsparrot/web-common/tests/fixtures/statsparrot-dev-fixtures";

export const test = rillDev.extend({
  page: async ({ rillDevPage }, use) => {
    await use(rillDevPage);
  },
});
