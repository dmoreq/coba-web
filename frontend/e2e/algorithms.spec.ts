import { test } from "@playwright/test";
import { ALGORITHM_SMOKE } from "./fixtures/algorithms";
import { gotoPlayground, selectAlgorithm, stepTimes } from "./helpers/playground";

test.describe("Algorithm smoke (all 16)", () => {
  for (const { name } of ALGORITHM_SMOKE) {
    test(`${name} runs 3 steps without error`, async ({ page }) => {
      await gotoPlayground(page);
      await selectAlgorithm(page, name);
      await stepTimes(page, 3);
    });
  }
});
