import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const productId = '80000000-0000-4000-8000-000000000001';
const fixture = `http://127.0.0.1:${process.env.XENON_FIXTURE_AUTH_PORT || 54339}`;
const controlHeaders = { 'x-xenon-fixture': 'local-browser-only' };
const photo = name => ({ name, mimeType: 'image/png', buffer: fs.readFileSync('public/images/hero.png') });
function sql(statement) {
  const result = spawnSync('psql', ['-X', '-At', '-v', 'ON_ERROR_STOP=1', '-d', process.env.XENON_BROWSER_DATABASE, '-c', statement], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
async function login(page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill('editor@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await page.goto(`/admin/products/${productId}/edit`);
  await expect(page.getByRole('heading', { name: 'Product images (3)' })).toBeVisible();
}
async function save(page) {
  await page.getByRole('button', { name: 'Update product', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Product (updated|saved)/ })).toBeVisible();
  await expect(page.getByText('Unsaved image changes', { exact: true })).toHaveCount(0);
}
async function capture(page, name) {
  fs.mkdirSync('.impeccable/review/images', { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  const bounds = await page.getByRole('group', { name: 'Photography', exact: true }).evaluate(element => {
    const r = element.getBoundingClientRect(); return { x:r.x, y:r.y+scrollY, width:r.width, height:r.height };
  });
  await page.screenshot({ path: `.impeccable/review/images/${name}-page.png`, fullPage: true, animations: 'disabled' });
  fs.writeFileSync(`.impeccable/review/images/${name}-bounds.json`, JSON.stringify(bounds));
}
const rows = page => page.locator('article[aria-label^="Image "]');
test.beforeEach(async ({ request }) => {
  expect(await (await request.get(`${fixture}/health`)).json()).toMatchObject({ fixture: true });
  const response = await request.post(`${fixture}/__fixture/reset-gallery`, { headers: controlHeaders });
  expect(response.ok()).toBe(true);
});

test('saved photographs support replace, ordering, main selection, undo and storefront refresh', async ({ page }) => {
  await login(page);
  const initialIds = sql(`select string_agg(id::text,',' order by id) from product_images where product_id='${productId}'`);
  await page.getByLabel('Alternative text for image 1').fill('Front photograph');
  await rows(page).nth(2).getByRole('button', { name: 'Make main', exact: true }).click();
  await expect(page.getByLabel('Alternative text for image 1')).toHaveValue('Fixture photograph C');
  await page.getByRole('button', { name: 'Move image 1 later' }).click();
  await expect(page.getByLabel('Alternative text for image 1')).toHaveValue('Front photograph');
  await rows(page).nth(1).getByRole('button', { name: 'Remove image', exact: true }).click();
  await expect(rows(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo removal', exact: true }).click();
  await expect(rows(page)).toHaveCount(3);
  const replacedUrl = await rows(page).nth(1).locator('img').getAttribute('src');
  await page.getByLabel('Replace image 2', { exact: true }).setInputFiles(photo('replacement.png'));
  await expect(page.getByText('Replacement ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel replacement', exact: true }).click();
  await expect(rows(page).nth(1).locator('img')).toHaveAttribute('src', replacedUrl);
  await page.getByLabel('Replace image 2', { exact: true }).setInputFiles(photo('replacement.png'));
  await page.getByLabel('Add photographs', { exact: true }).setInputFiles(photo('added.png'));
  await expect(rows(page)).toHaveCount(4);
  await page.getByLabel('Alternative text for image 4').fill('Additional photograph');
  await capture(page, 'queued');
  await save(page);
  expect(sql(`select sale_price is null from products where id='${productId}'`)).toBe('t');
  expect(sql(`select price=1000 from product_variants where product_id='${productId}'`)).toBe('t');
  expect(sql(`select count(*) from product_images where product_id='${productId}' and id::text=any(string_to_array('${initialIds}',','))`)).toBe('3');
  expect(sql(`select count(*) from product_images where product_id='${productId}'`)).toBe('4');
  expect(sql(`select count(*) from product_images where product_id='${productId}' and is_primary`)).toBe('1');
  const replacedPath = decodeURIComponent(new URL(replacedUrl).pathname.split('/public/product-images/')[1]);
  expect(sql(`select count(*) from storage.objects where bucket_id='product-images' and name='${replacedPath}'`)).toBe('0');
  await save(page);
  expect(sql(`select count(*) from product_images where product_id='${productId}'`)).toBe('4');
  await page.reload();
  await expect(rows(page)).toHaveCount(4);
  await expect(page.getByLabel('Alternative text for image 1')).toHaveValue('Front photograph');
  await page.goto('/products/gallery-browser-fixture');
  await expect(page.getByRole('button', { name: 'Zoom product image', exact: true }).locator('img')).toHaveAttribute('alt', 'Front photograph');
});

test('failures preserve file selections and product input; cleanup retries do not undo a save', async ({ page, request }) => {
  await login(page);
  await page.getByLabel('Short description', { exact: true }).fill('Keep this unsaved description');
  await page.getByLabel('Add photographs', { exact: true }).setInputFiles([photo('first.png'), photo('second.png')]);
  await expect(rows(page)).toHaveCount(5);
  await request.post(`${fixture}/__fixture/storage-failure`, { headers: controlHeaders, data: { uploadAfter: 1 } });
  await page.getByRole('button', { name: 'Update product', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Images could not be uploaded.' })).toBeVisible();
  await expect(page.getByLabel('Short description', { exact: true })).toHaveValue('Keep this unsaved description');
  await expect(rows(page)).toHaveCount(5);
  await capture(page, 'save-failed');
  expect(sql(`select count(*) from product_images where product_id='${productId}'`)).toBe('3');
  expect(sql("select count(*) from storage.objects where bucket_id='product-images' and name not like 'products/browser-%'")).toBe('0');
  await save(page);
  expect(sql(`select count(*) from product_images where product_id='${productId}'`)).toBe('5');
  await rows(page).nth(0).getByRole('button', { name: 'Remove image', exact: true }).click();
  await request.post(`${fixture}/__fixture/storage-failure`, { headers: controlHeaders, data: { deletes: 1 } });
  await save(page);
  await expect(page.getByRole('button', { name: 'Retry cleanup', exact: true })).toBeVisible();
  await capture(page, 'cleanup-pending');
  expect(sql(`select count(*) from product_images where product_id='${productId}'`)).toBe('4');
  expect(sql("select count(*) from storage.objects where name='products/browser-a.png'")).toBe('1');
  await page.getByRole('button', { name: 'Retry cleanup', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Unused image cleanup complete.' })).toBeVisible();
  expect(sql("select count(*) from storage.objects where name='products/browser-a.png'")).toBe('0');
});

test('stale galleries require reload, shared originals survive, and empty galleries are supported', async ({ page }) => {
  await login(page);
  await page.getByLabel('Short description', { exact: true }).fill('Other fields stay');
  await page.getByLabel('Alternative text for image 1').fill('Unsaved photograph description');
  sql(`update product_images set alt_text='Concurrent photograph description' where product_id='${productId}' and is_primary`);
  await page.getByRole('button', { name: 'Update product', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Another editor changed these images.' })).toBeVisible();
  await expect(page.getByLabel('Alternative text for image 1')).toHaveValue('Unsaved photograph description');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reload images', exact: true }).click();
  await expect(page.getByLabel('Alternative text for image 1')).toHaveValue('Concurrent photograph description');
  await expect(page.getByLabel('Short description', { exact: true })).toHaveValue('Other fields stay');
  const protectedUrl = await rows(page).first().locator('img').getAttribute('src');
  sql(`insert into content_revisions(document_id,payload) select id,jsonb_build_object('version',1,'browserFixtureAsset','${protectedUrl}') from content_documents where key='site'`);
  while (await rows(page).count()) await rows(page).first().getByRole('button', { name: 'Remove image', exact: true }).click();
  await save(page);
  await expect(page.getByText('No images in this gallery.', { exact: false })).toBeVisible();
  await capture(page, 'empty');
  expect(sql("select count(*) from storage.objects where name='products/browser-a.png'")).toBe('1');
  expect(sql(`select count(*) from product_images where product_id='${productId}'`)).toBe('0');
});

test('gallery is responsive, keyboard usable, and keeps broken images manageable', async ({ page }) => {
  await login(page);
  fs.mkdirSync('.impeccable/review/images', { recursive: true });
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const section = page.getByRole('group', { name: 'Photography', exact: true });
    await page.evaluate(() => document.fonts.ready);
    await expect(section.locator('img')).toHaveCount(3);
    await expect.poll(() => section.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await capture(page, `gallery-${width}`);
  }
  await page.getByRole('button', { name: 'Move image 2 earlier' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Alternative text for image 1')).toHaveValue('Fixture photograph B');
  await page.getByRole('link', { name: 'Back', exact: true }).focus();
  page.once('dialog', dialog => dialog.dismiss());
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/admin/products/${productId}/edit`));
  page.once('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(page.getByLabel('Alternative text for image 1')).toHaveValue('Fixture photograph A');
  sql(`update product_images set image_url='${fixture}/storage/v1/object/public/product-images/products/missing.png' where product_id='${productId}' and is_primary`);
  await page.reload();
  await expect(page.getByText('Image unavailable', { exact: true })).toBeVisible();
  await expect(rows(page).first().getByRole('button', { name: 'Replace', exact: true })).toBeEnabled();
  await capture(page, 'broken');
});

test('new products use the same gallery and open the saved editor', async ({ page }) => {
  await login(page);
  await page.goto('/admin/products/new');
  await page.getByLabel('Name', { exact: true }).fill('New gallery browser product');
  await page.getByLabel('SKU', { exact: true }).first().fill('BROWSER-NEW-GALLERY');
  const variants = page.getByRole('group', { name: 'Variants and stock', exact: true });
  await variants.getByLabel('SKU', { exact: true }).fill('BROWSER-NEW-GALLERY-FS');
  await page.getByLabel('Add photographs', { exact: true }).setInputFiles(photo('new-product.png'));
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Create product', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+\/edit$/);
  await expect(rows(page)).toHaveCount(1);
});

test('browser Back and Forward warn and preserve staged gallery files when cancelled', async ({ page }) => {
  await login(page);
  await page.goto('/admin/products');
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('row').filter({ hasText: 'Gallery browser fixture' }).getByRole('link', { name: 'Edit', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/products/${productId}/edit`));
  expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(timeOrigin);
  await page.getByLabel('Alternative text for image 1').fill('Keep my staged gallery');
  await page.getByLabel('Add photographs', { exact: true }).setInputFiles(photo('history.png'));
  await expect(rows(page)).toHaveCount(4);
  const backDialog = page.waitForEvent('dialog');
  const backAttempt = page.evaluate(() => history.back());
  const backConfirmation = await backDialog;
  expect(backConfirmation.type()).toBe('beforeunload');
  await backConfirmation.dismiss();
  await backAttempt;
  await expect(page).toHaveURL(new RegExp(`/admin/products/${productId}/edit`));
  await expect(page.getByLabel('Alternative text for image 1')).toHaveValue('Keep my staged gallery');
  await expect(rows(page)).toHaveCount(4);
  page.once('dialog', dialog => dialog.accept());
  await page.goBack({ waitUntil: 'commit' });
  await expect(page).toHaveURL(/\/admin\/products$/);

  await page.getByRole('row').filter({ hasText: 'Gallery browser fixture' }).getByRole('link', { name: 'Edit', exact: true }).click();
  await expect(rows(page)).toHaveCount(3);
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/admin/products/${productId}/edit`));
  await page.getByLabel('Alternative text for image 1').fill('Keep my forward edits');
  const forwardDialog = page.waitForEvent('dialog');
  const forwardAttempt = page.evaluate(() => history.forward());
  const confirmation = await forwardDialog;
  expect(confirmation.type()).toBe('beforeunload');
  await confirmation.dismiss();
  await forwardAttempt;
  await expect(page).toHaveURL(new RegExp(`/admin/products/${productId}/edit`));
  await expect(page.getByLabel('Alternative text for image 1')).toHaveValue('Keep my forward edits');
  page.once('dialog', dialog => dialog.accept());
  await page.goForward({ waitUntil: "commit" });
  await expect(page).toHaveURL(/\/admin\/products$/);
});
