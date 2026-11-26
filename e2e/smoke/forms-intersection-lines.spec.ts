import { test, expect, type Page } from '../labsTest';

// An intersection curve lies on the surface of two forms, so every pixel it paints sits over a
// form, never over the bare background. When three-bvh-csg 0.0.18 moved its output into brush
// A's local space (#67), the curves floated off into empty space and nothing failed. The unit
// test pins the geometry; this pins what reaches the screen.

const BACKGROUND = [250, 250, 250]; // #fafafa, the canvas background in FormsThreeScene

/** Seeded Math.random so the scene is the same on every run. */
function seedRandom(seed: number) {
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function canvasPng(page: Page): Promise<string> {
  // Two frames apart, so the toggle has painted.
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  );
  return (await page.locator('canvas').screenshot()).toString('base64');
}

/** Counts, in the page, the pixels the lines change and how many of those sit over bare background. */
function countLinePixels(page: Page, withLines: string, without: string) {
  return page.evaluate(
    async ({ withLines, without, background }) => {
      const decode = async (data: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const a = await decode(withLines);
      const b = await decode(without);
      let linePixels = 0;
      let overBackground = 0;
      for (let i = 0; i < a.length; i += 4) {
        const delta =
          Math.abs(a[i] - b[i]) +
          Math.abs(a[i + 1] - b[i + 1]) +
          Math.abs(a[i + 2] - b[i + 2]);
        if (delta < 60) continue;
        linePixels++;
        const underneath =
          Math.abs(b[i] - background[0]) +
          Math.abs(b[i + 1] - background[1]) +
          Math.abs(b[i + 2] - background[2]);
        if (underneath < 6) overBackground++;
      }
      return { linePixels, overBackground, sameSize: a.length === b.length };
    },
    { withLines, without, background: BACKGROUND }
  );
}

// Measured over seeds 1-12: correct output puts at most 3 line pixels (0.1%) over background.
// With the #67 bug, these four put 150-394 there (6-17%); in the other eight the misplaced
// lines happened to land on some form. Keep seeds that make the bug visible.
for (const seed of [1, 2, 5, 8]) {
  test(`intersection lines sit on the forms (seed ${seed})`, async ({
    page,
  }) => {
    await page.addInitScript(seedRandom, seed);
    await page.goto('/forms/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
    const hide = page.getByTitle('Hide intersections');
    await expect(hide).toBeVisible();

    const withLines = await canvasPng(page);
    await hide.click();
    await expect(page.getByTitle('Show intersections')).toBeVisible();
    const { linePixels, overBackground, sameSize } = await countLinePixels(
      page,
      withLines,
      await canvasPng(page)
    );
    expect(sameSize).toBe(true);

    // Lines are drawn at all, and (antialiasing at a silhouette aside) only over forms.
    expect(linePixels).toBeGreaterThan(100);
    expect(overBackground / linePixels).toBeLessThan(0.01);
  });
}
