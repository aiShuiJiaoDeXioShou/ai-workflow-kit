import { expect, test, type Locator, type Page } from "@playwright/test";

async function dragLocatorToPoint(
  page: Page,
  source: Locator,
  point: { x: number; y: number },
) {
  const sourceBox = await source.boundingBox();
  if (!sourceBox) {
    throw new Error("Source element is not visible");
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 16 });
  await page.mouse.up();
}

test("dragging a palette component onto the FlowGram canvas creates a node", async ({
  page,
}) => {
  await page.route("**/health", async (route) => {
    await route.fulfill({
      body: "ok",
      headers: {
        "access-control-allow-origin": "*",
      },
      status: 200,
    });
  });
  await page.goto("/");

  const paletteItem = page
    .locator(".component-palette__item")
    .filter({ hasText: "HTTP 健康检查" });
  const canvas = page.locator(".root-flowgram-canvas");
  const nodes = page.locator(".flowgram-workflow-node");

  await expect(paletteItem).toHaveCount(1);
  await expect(canvas).toBeVisible();
  await expect(nodes).toHaveCount(0);

  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) {
    throw new Error("Canvas is not visible");
  }

  await dragLocatorToPoint(page, paletteItem, {
    x: canvasBox.x + canvasBox.width * 0.52,
    y: canvasBox.y + canvasBox.height * 0.72,
  });

  await expect(nodes).toHaveCount(1);
  await expect(nodes.filter({ hasText: "HTTP 健康检查" })).toHaveCount(1);
  await expect(page.locator(".inspector-panel")).toContainText("HTTP 健康检查");

  const nextUrl = "https://api.example.com/health";
  await page.getByLabel("URL").fill(nextUrl);

  await expect(page.getByLabel("URL")).toHaveValue(nextUrl);
  await expect(nodes.first()).toContainText(`GET ${nextUrl}`);
});

test("canvas nodes are restored after page reload", async ({ page }) => {
  await page.route("**/health", async (route) => {
    await route.fulfill({
      body: "ok",
      headers: {
        "access-control-allow-origin": "*",
      },
      status: 200,
    });
  });
  await page.goto("/");

  const paletteItem = page
    .locator(".component-palette__item")
    .filter({ hasText: "HTTP 健康检查" });
  const canvas = page.locator(".root-flowgram-canvas");
  const nodes = page.locator(".flowgram-workflow-node");

  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) {
    throw new Error("Canvas is not visible");
  }

  await dragLocatorToPoint(page, paletteItem, {
    x: canvasBox.x + canvasBox.width * 0.52,
    y: canvasBox.y + canvasBox.height * 0.72,
  });

  await expect(nodes.filter({ hasText: "HTTP 健康检查" })).toHaveCount(1);
  await page.waitForFunction(() =>
    window.localStorage
      .getItem("ai-workflow-kit:canvas-snapshot:root")
      ?.includes("HTTP 健康检查"),
  );

  await page.reload();

  await expect(page.locator(".workbench-loading")).toHaveCount(0);
  await expect(nodes.filter({ hasText: "HTTP 健康检查" })).toHaveCount(1);
});

test("HTTP health manual and interval checks update the canvas and run log", async ({
  page,
}) => {
  await page.route("**/health", async (route) => {
    await route.fulfill({
      body: "ok",
      headers: {
        "access-control-allow-origin": "*",
      },
      status: 200,
    });
  });
  await page.goto("/");

  const paletteItem = page
    .locator(".component-palette__item")
    .filter({ hasText: "HTTP 健康检查" });
  const canvas = page.locator(".root-flowgram-canvas");
  const nodes = page.locator(".flowgram-workflow-node");

  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) {
    throw new Error("Canvas is not visible");
  }

  await dragLocatorToPoint(page, paletteItem, {
    x: canvasBox.x + canvasBox.width * 0.52,
    y: canvasBox.y + canvasBox.height * 0.72,
  });

  const nextUrl = "https://api.example.com/health";
  await page.getByLabel("URL").fill(nextUrl);
  await page.getByLabel("检测间隔秒数").fill("5");

  await expect(nodes.first()).toContainText("正常");
  await expect(page.locator(".run-log-drawer")).toContainText(
    "自动开始 HTTP 检测",
  );

  await page.getByRole("button", { name: /^立即检测$/ }).first().click();

  await expect(page.locator(".run-log-drawer")).toContainText(
    "手动开始 HTTP 检测",
  );
  await expect(nodes.first()).toContainText("U");
});

test("releasing a palette drag outside the canvas does not create a node", async ({
  page,
}) => {
  await page.goto("/");

  const paletteItem = page
    .locator(".component-palette__item")
    .filter({ hasText: "HTTP 健康检查" });
  const nodes = page.locator(".flowgram-workflow-node");

  await expect(paletteItem).toHaveCount(1);
  await expect(nodes).toHaveCount(0);

  await dragLocatorToPoint(page, paletteItem, { x: 60, y: 620 });

  await expect(nodes).toHaveCount(0);
});

test("workbench panels can be minimized and restored", async ({ page }) => {
  await page.goto("/");

  const shell = page.locator(".workbench-shell");

  await expect(shell).toHaveAttribute("data-palette-minimized", "false");
  await page.getByRole("button", { name: "最小化组件面板" }).click();
  await expect(shell).toHaveAttribute("data-palette-minimized", "true");
  await expect(page.locator(".component-palette__item")).toHaveCount(0);
  await page.getByRole("button", { name: "展开组件面板" }).click();
  await expect(shell).toHaveAttribute("data-palette-minimized", "false");
  await expect(page.locator(".component-palette__item")).toHaveCount(4);

  await expect(shell).toHaveAttribute("data-inspector-minimized", "false");
  await page.getByRole("button", { name: "最小化属性检查器" }).click();
  await expect(shell).toHaveAttribute("data-inspector-minimized", "true");
  await page.getByRole("button", { name: "展开属性检查器" }).click();
  await expect(shell).toHaveAttribute("data-inspector-minimized", "false");

  await expect(shell).toHaveAttribute("data-log-minimized", "false");
  await page.getByRole("button", { name: "最小化运行日志" }).click();
  await expect(shell).toHaveAttribute("data-log-minimized", "true");
  await page.getByRole("button", { name: "展开运行日志" }).click();
  await expect(shell).toHaveAttribute("data-log-minimized", "false");
});
