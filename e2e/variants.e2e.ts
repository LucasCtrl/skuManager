// Product variants and swaps (docs/products.md#variants).
import assert from "node:assert/strict";
import type { Ctx } from "./run";

export default async function ({ page, rpc, step }: Ctx) {
  // Tool ID card: a card part (black PMMA, 0.1 sheet) ×10 and a small screw.
  const entry = async (
    list: "seller" | "unit" | "materialType" | "partType" | "colour",
    n: string,
  ) => (await rpc("addEntry", { list, name: n, code: n })).id;
  const seller = await entry("seller", "LACRY");
  const sheet = await entry("unit", "sheet");
  const piece = await entry("unit", "piece");
  const pmma = await entry("materialType", "PMMA");
  const screw = await entry("partType", "SCREW");
  const item = (
    kind: "material" | "part",
    typeId: number,
    colourId: number | null,
    spec: string,
    unitId: number,
    amount: number,
  ) =>
    rpc("createItem", {
      kind,
      sellerId: seller,
      typeId,
      colourId,
      finishId: null,
      size: kind === "material" ? "3MM" : "",
      specs: kind === "part" ? [spec] : [],
      unitId,
      description: "",
      sellerSku: "",
      firstPrice: { date: "2026-01-01", amount },
    });
  const blk = await item("material", pmma, await entry("colour", "BLK"), "", sheet, 80000);
  await item("material", pmma, await entry("colour", "CLR"), "", sheet, 120000);
  const s = await item("part", screw, null, "S", piece, 500);
  await item("part", screw, null, "L", piece, 900);
  const prd = await rpc("createProduct", { name: "Tool ID card HSK63F", description: "" });
  const card = await rpc("createPart", { productId: prd.id, name: "Card", description: "" });
  await rpc("addLine", {
    owner: { kind: "version", id: card.id },
    component: { kind: "item", id: blk.id },
    quantity: 100,
  });
  await rpc("updatePartVersion", { id: card.id, description: "", status: "Active" });
  const P = { kind: "product" as const, id: prd.id };
  await rpc("addLine", { owner: P, component: { kind: "version", id: card.id }, quantity: 10 });
  await rpc("addLine", { owner: P, component: { kind: "item", id: s.id }, quantity: 1000 });
  await rpc("createOperation", {
    name: "Packing",
    description: "",
    rateKind: "hour",
    unitId: null,
    firstRate: { date: "2026-01-01", amount: 200000 }, // €20 / h
  });
  await page.reload();

  const main = page.locator("main");
  const see = (text: string) => main.getByText(text).first().waitFor();
  const dialog = page.getByRole("dialog");
  // the swap targets load after X is picked
  const options = async (sel: string) => {
    await page.locator(`${sel} option`).nth(1).waitFor({ state: "attached" });
    return page.locator(`${sel} option`).allTextContents();
  };
  const confirms: string[] = [];
  page.on("dialog", (d) => confirms.push(d.message()));

  await step("product list shows the cost", async () => {
    await see("EK-PRD-00001");
    await see("€8.05");
  });

  await step("a product without variants has its composition", async () => {
    await main.getByText("Tool ID card HSK63F").click();
    await see("No variants: the product has its own composition");
    await see("2 lines");
  });

  await step("new variant dialog: code focused, SKU preview", async () => {
    await main.getByRole("button", { name: "New variant" }).click();
    await page.locator("#var-code:focus").waitFor();
    await page.keyboard.type("blk 10");
    await page.getByLabel("Name").fill("Black ×10");
    await dialog.getByText("EK-PRD-00001-BLK10").waitFor();
    await dialog.getByText("This is the first variant").waitFor();
  });

  await step("the first variant takes the product's composition", async () => {
    await page.getByRole("button", { name: "Create variant" }).click();
    await see("No swaps: the parts are used as they are.");
    await see("2 lines");
    await see("€8.05");
  });

  await step("a duplicate code is refused", async () => {
    await main.getByRole("button", { name: "Copy" }).click();
    await page.locator("#var-code").fill("BLK10");
    await dialog.getByText("Code BLK10 is already used by Black ×10").waitFor();
    assert.ok(await page.getByRole("button", { name: "Create variant" }).isDisabled());
  });

  await step("copy a variant", async () => {
    await page.locator("#var-code").fill("clr10");
    await page.getByLabel("Name").fill("Clear ×10");
    assert.notEqual(await page.locator("#var-copy").inputValue(), "", "source preselected");
    await page.getByRole("button", { name: "Create variant" }).click();
    await main.getByRole("heading", { name: "Clear ×10" }).waitFor();
    await see("2 lines");
  });

  await step("swap dialog lists items at any depth, same kind and unit", async () => {
    await main.getByRole("button", { name: "Add swap" }).click();
    const from = await options("#swap-from");
    assert.ok(
      from.some((o) => o.includes("PMMA-BLK")),
      "black PMMA from inside the card part",
    );
    assert.ok(
      from.some((o) => o.includes("SCREW-S")),
      "screw on the variant itself",
    );
    await page
      .locator("#swap-from")
      .selectOption({ label: from.find((o) => o.includes("PMMA-BLK"))! });
    const to = await options("#swap-to");
    assert.equal(to.length, 2, `only clear PMMA offered, got ${to}`);
    await page.locator("#swap-to").selectOption({ index: 1 });
  });

  await step("a swap applies inside the parts", async () => {
    await dialog.getByRole("button", { name: "Add swap" }).click();
    await see("EK-MAT-LACRY-PMMA-CLR-3MM");
    await see("€12.05");
  });

  await step("a swap on a line of the variant", async () => {
    await main.getByRole("button", { name: "Add swap" }).click();
    const from = await options("#swap-from");
    assert.ok(!from.some((o) => o.includes("PMMA-BLK")), "already swapped item not offered");
    await page
      .locator("#swap-from")
      .selectOption({ label: from.find((o) => o.includes("SCREW-S"))! });
    await options("#swap-to");
    await page.locator("#swap-to").selectOption({ index: 1 });
    await dialog.getByRole("button", { name: "Add swap" }).click();
    await see("Uses EK-PRT-LACRY-SCREW-L (swap)");
    await see("€12.09");
  });

  await step("the replacement item is used by the variant", async () => {
    await main.getByRole("button", { name: /EK-MAT-LACRY-PMMA-CLR-3MM/ }).click();
    await see("Product variant");
    await main.getByRole("button", { name: /EK-PRD-00001-CLR10/ }).click();
    await main.getByRole("heading", { name: "Clear ×10" }).waitFor();
  });

  await step("a swap whose item is gone is not used", async () => {
    await main.getByRole("button", { name: "Delete line EK-MAN-00001-card-v1" }).click();
    await see("Not used");
    await see("€0.09");
  });

  await step("the product shows its variants and a cost range", async () => {
    await main.getByRole("button", { name: /Tool ID card HSK63F/ }).click();
    await see("2 variants");
    await see("€0.09 – €8.05");
    assert.equal(await main.getByRole("heading", { name: "Composition" }).count(), 0);
  });

  await step("the product list searches variants", async () => {
    await page.locator("header").getByRole("button", { name: "Products", exact: true }).click();
    await page.getByLabel("Search products").fill("clear");
    await see("€0.09 – €8.05");
    await page.getByLabel("Search products").fill("");
  });

  await step("a retired product locks its variants", async () => {
    await main.getByText("Tool ID card HSK63F").click();
    await main.getByRole("button", { name: "Edit" }).click();
    await dialog.getByText("Retired", { exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await see("Locked: the product is retired");
    assert.equal(await main.getByRole("button", { name: "New variant" }).count(), 0);
    await main.getByText("Black ×10").click();
    await main.getByRole("heading", { name: "Black ×10" }).waitFor();
    for (const b of ["Copy", "Delete", "Add swap", "Add line"])
      assert.equal(
        await main.getByRole("button", { name: b, exact: true }).count(),
        0,
        `${b} hidden`,
      );
  });

  await step("deleting the last variant gives the composition back", async () => {
    await main.getByRole("button", { name: /Tool ID card HSK63F/ }).click();
    await main.getByRole("button", { name: "Edit" }).click();
    await dialog.getByText("Active", { exact: true }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await main.getByText("Clear ×10").click();
    await main.getByRole("button", { name: "Delete", exact: true }).click();
    await see("1 variants");
    assert.doesNotMatch(confirms.at(-1)!, /last one/);
    await main.getByText("Black ×10").click();
    await main.getByRole("button", { name: "Delete", exact: true }).click();
    await see("No variants: the product has its own composition");
    await see("2 lines");
    await see("€8.05");
    assert.match(confirms.at(-1)!, /last one: its composition moves back to the product/);
  });

  await step("an operation counts once on the product", async () => {
    await main.getByRole("button", { name: "Add line" }).click();
    await page.locator("#line-kind").selectOption({ label: "Operation" });
    await page.locator("#line-item option").nth(1).waitFor({ state: "attached" });
    await page.locator("#line-item").selectOption({ index: 1 });
    await page.getByLabel("Minutes").fill("30");
    await dialog.getByRole("button", { name: "Add line" }).click();
    await see("3 lines");
    await see("€18.05");
  });

  await step("French", async () => {
    await rpc("setSettings", { lang: "fr" });
    await page.reload();
    await main.getByText("Tool ID card HSK63F").click();
    await see("Aucune variante");
  });
}
