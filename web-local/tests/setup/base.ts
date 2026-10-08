import { statsparrotDev } from "@statsparrot/web-common/tests/fixtures/statsparrot-dev-fixtures";

export const test = statsparrotDev.extend({
  page: async ({ statsparrotDevPage }, use) => {
    await use(statsparrotDevPage);
  },
});
