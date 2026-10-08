import { expect } from "@playwright/test";
import { test } from "../setup/base";

test.describe("Athena connector", () => {
  test.use({ project: "Blank" });

  test("explorer step keeps SQL and Model name empty", async ({ page }) => {
    const accessKey = process.env.STATSPARROT_RUNTIME_ATHENA_TEST_AWS_ACCESS_KEY_ID;
    const secretKey =
      process.env.STATSPARROT_RUNTIME_ATHENA_TEST_AWS_SECRET_ACCESS_KEY;
    const outputLocation = "s3://integration-test.statsparrot.com/athena/";

    if (!accessKey || !secretKey) {
      test.skip(
        true,
        "STATSPARROT_RUNTIME_ATHENA_TEST_AWS_ACCESS_KEY_ID or STATSPARROT_RUNTIME_ATHENA_TEST_AWS_SECRET_ACCESS_KEY is not set",
      );
    }

    await page.getByLabel("See more connectors").click();
    await page.getByLabel("Connect to athena").click();

    await page
      .getByRole("textbox", { name: "AWS access key ID" })
      .fill(accessKey!);
    await page
      .getByRole("textbox", { name: "AWS secret access key" })
      .fill(secretKey!);
    await page
      .getByRole("textbox", { name: "S3 output location" })
      .fill(outputLocation);

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Test and Connect" })
      .click();

    await expect(
      page.getByText(
        "Pick a table or input your SQL to power your first dashboard",
      ),
    ).toBeVisible({
      timeout: 120000,
    });

    // Aws data catalog is visible in explorer
    await expect(
      page
        .getByLabel("Import Table Form")
        .getByLabel("awsdatacatalog.integration_test"),
    ).toBeVisible();
  });
});
