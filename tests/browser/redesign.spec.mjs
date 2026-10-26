import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const localSQL = sql => { const result = spawnSync('psql', ['-X', '-At', '-d', process.env.XENON_BROWSER_DATABASE || 'postgresql://127.0.0.1:55439/xenon_browser', '-c', sql], { encoding: 'utf8' }); if (result.status !== 0)
    throw new Error(result.stderr); return result.stdout.trim(); };
const base = `http://127.0.0.1:${process.env.XENON_BROWSER_PORT || 3000}`;
test.describe.configure({ mode: 'default' });
async function login(page) { await page.goto('/admin/login'); await page.getByLabel('Email', { exact: true }).fill('editor@example.test'); await page.getByLabel('Password', { exact: true }).fill('fixture-password'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page).toHaveURL(/\/admin\/dashboard/); }
async function settle(page) { await page.locator('main h1, main h2').first().waitFor({ state: 'visible' }); await page.locator('main .animate-pulse').first().waitFor({ state: 'hidden' }); await page.evaluate(() => document.fonts.ready); await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }); await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) {
    scrollTo(0, y);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
} scrollTo(0, 0); }); await page.evaluate(async () => { await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => { }); })); }); }
test.beforeAll(async ({ request }) => { const health = await request.get(`http://127.0.0.1:${process.env.XENON_FIXTURE_AUTH_PORT || 54339}/health`); expect(await health.json()).toMatchObject({ fixture: true, auth: 'test shim' }); localSQL("update promo_codes set is_active=true where code='BROWSER10'"); });
test('store navigation, filters and modal focus remain usable', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Define Your Style' })).toBeVisible();
    const trigger = page.getByRole('button', { name: 'Search products', exact: true });
    await trigger.click();
    await page.getByRole('textbox', { name: 'Search the collection' }).fill('Satin');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/q=Satin/);
    await expect(page.getByRole('heading', { name: 'Results for “Satin”' })).toBeVisible();
    await page.getByRole('button', { name: /^Filter/ }).click();
    await page.getByRole('combobox', { name: 'Color', exact: true }).selectOption('Black');
    await page.getByRole('button', { name: 'Show results' }).click();
    await expect(page).toHaveURL(/color=Black/);
    await expect(page.getByRole('button', { name: 'Remove filter Black' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove filter Black' }).click();
    await expect(page).not.toHaveURL(/color=Black/);
    await page.getByRole('button', { name: /^Filter/ }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /^Filter/ })).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeFocused();
    expect(errors).toEqual([]);
});
test('bag, promotion edits, duplicate prevention and COD checkout', async ({ page }) => {
    const initialOrders = Number(localSQL('select count(*) from orders'));
    await page.goto('/products/noir-satin-column-dress');
    await page.getByRole('button', { name: 'Add to bag', exact: true }).first().click();
    await expect(page.getByRole('status').filter({ hasText: 'Added to cart.' })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: /Open cart/ }).click();
    await expect(page.getByRole('heading', { name: 'Your bag' })).toBeVisible();
    await page.getByRole('button', { name: 'Checkout', exact: true }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await page.getByLabel('Full name', { exact: true }).fill('Browser Test');
    await page.getByLabel('Phone', { exact: true }).fill('0771234567');
    await page.getByLabel('Address line 1', { exact: true }).fill('Test address');
    await page.getByLabel('City', { exact: true }).fill('Test city');
    await page.getByLabel('District', { exact: true }).selectOption('40000000-0000-4000-8000-000000000001');
    await page.getByLabel('Promo code', { exact: true }).fill('BROWSER10');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Promo code applied.' })).toBeVisible();
    await page.getByLabel('Promo code', { exact: true }).fill('');
    await expect(page.getByText('-LKR 0.00', { exact: true })).toBeVisible();
    const place = page.getByRole('button', { name: 'Place order', exact: true });
    await place.dblclick();
    await expect(page).toHaveURL(/\/payment\/success\?order=/);
    expect(Number(localSQL('select count(*) from orders')) - initialOrders).toBe(1);
    await expect(page.getByText('Your order has been received.', { exact: false })).toBeVisible();
    await page.goto('/products');
    await page.getByRole('button', { name: /Open cart/ }).click();
    await expect(page.getByText('Your bag is empty.', { exact: true })).toBeVisible();
});
test('checkout request failure preserves the bag and entered delivery details', async ({ page }) => {
    await page.goto('/products/noir-satin-column-dress');
    await page.getByRole('button', { name: 'Add to bag', exact: true }).first().click();
    await expect(page.getByRole('status').filter({ hasText: 'Added to cart.' })).toBeVisible();
    await page.goto('/checkout');
    await page.getByLabel('Full name', { exact: true }).fill('Failure Test');
    await page.getByLabel('Phone', { exact: true }).fill('0771234567');
    await page.getByLabel('Address line 1', { exact: true }).fill('Saved test address');
    await page.getByLabel('City', { exact: true }).fill('Test city');
    await page.getByLabel('District', { exact: true }).selectOption('40000000-0000-4000-8000-000000000001');
    await expect(page.getByRole('button', { name: 'Place order', exact: true })).toBeEnabled();
    await page.route('**/checkout', route => route.request().method() === 'POST' && route.request().postData()?.includes('Failure Test') ? route.abort('failed') : route.continue());
    await page.getByRole('button', { name: 'Place order', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Your bag is saved.' })).toBeVisible();
    await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Failure Test');
    await expect(page.getByRole('button', { name: 'Place order', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: /Open cart/ }).click();
    await expect(page.getByText('Noir Satin Column Dress', { exact: true }).last()).toBeVisible();
});
test('delivery quote retries retain the selected district and input', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByLabel('Full name', { exact: true }).fill('Retry Test');
    await page.route('**/checkout', route => route.request().method() === 'POST' && route.request().postData()?.includes('40000000-0000-4000-8000-000000000001') ? route.abort('failed') : route.continue());
    await page.getByLabel('District', { exact: true }).selectOption('40000000-0000-4000-8000-000000000001');
    const retry = page.getByRole('button', { name: 'Retry delivery quote', exact: true });
    await expect(retry).toBeVisible();
    await settle(page);
    await page.screenshot({ path: '.impeccable/review/delivery-retry-failed.png', fullPage: true });
    await page.unroute('**/checkout');
    await retry.click();
    await expect(retry).not.toBeVisible();
    await expect(page.locator('.checkout-summary').getByText('LKR 250.00', { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Retry Test');
    await expect(page.getByLabel('District', { exact: true })).toHaveValue('40000000-0000-4000-8000-000000000001');
});
test('primary actions have visible keyboard focus on both surfaces', async ({ page }) => {
    await page.goto('/');
    const shop = page.getByRole('link', { name: 'Shop Signature', exact: true });
    await page.getByRole('link', { name: 'Skip to content' }).focus();
    for (let i = 0; i < 20 && !(await shop.evaluate(el => el === document.activeElement)); i++)
        await page.keyboard.press('Tab');
    await expect(shop).toBeFocused();
    expect(await shop.evaluate(el => getComputedStyle(el).outlineColor)).toBe('rgb(17, 17, 17)');
    expect(await shop.evaluate(el => getComputedStyle(el).outlineWidth)).toBe('2px');
    await page.screenshot({ path: '.impeccable/review/focus-store.png' });
    await login(page);
    await page.goto('/admin/products');
    const create = page.getByRole('link', { name: 'New product', exact: true });
    await page.getByRole('link', { name: 'Skip to workspace' }).focus();
    for (let i = 0; i < 25 && !(await create.evaluate(el => el === document.activeElement)); i++)
        await page.keyboard.press('Tab');
    await expect(create).toBeFocused();
    expect(await create.evaluate(el => getComputedStyle(el).outlineColor)).toBe('rgb(17, 17, 17)');
    await page.screenshot({ path: '.impeccable/review/focus-admin.png' });
});
test('admin draft preview, publish and mutation feedback use the real local database', async ({ page, browser }) => {
    await login(page);
    await page.goto('/admin/website?key=new&kind=page');
    const slug = `browser-review-${Date.now()}`;
    await page.getByLabel('URL slug (fixed after first save)', { exact: true }).fill(slug);
    await page.getByLabel('Heading', { exact: true }).fill('Browser review page');
    await page.getByLabel(/Content \(Markdown/).fill('Test content for the local browser review.');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
    const anonymous = await browser.newContext();
    const publicPage = await anonymous.newPage();
    await publicPage.goto(`${base}/pages/${slug}`);
    await expect(publicPage.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await anonymous.close();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.frameLocator('iframe[title="Website draft preview"]').getByRole('heading', { name: 'Browser review page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Published.' })).toBeVisible();
    const live = await browser.newContext();
    const livePage = await live.newPage();
    await livePage.goto(`${base}/pages/${slug}`);
    await expect(livePage.getByRole('heading', { name: 'Browser review page' })).toBeVisible();
    await live.close();
    const stale = await page.context().newPage();
    await stale.goto(`${base}/admin/website?key=page%3A${slug}`);
    await page.getByLabel('Heading', { exact: true }).fill('New saved draft');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible();
    await stale.getByLabel('Heading', { exact: true }).fill('Concurrent unsaved draft');
    await stale.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(stale.getByRole('status').filter({ hasText: /changed|conflict|reload/i })).toBeVisible();
    await stale.close();
    await page.getByText('Revision history', { exact: true }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Restore draft', exact: true }).last().click();
    await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Browser review page');
    await page.goto('/admin/delivery-zones');
    const zone = page.locator('li').filter({ has: page.locator('input[value="Test District"]') });
    await zone.getByLabel('Delivery fee (LKR)').fill('275');
    await zone.getByRole('button', { name: 'Save changes' }).click();
    await expect(zone.getByRole('status').filter({ hasText: 'Delivery zone updated.' })).toBeVisible();
    await page.goto('/admin/promotions');
    const row = page.getByRole('row').filter({ hasText: 'BROWSER10' });
    await row.getByRole('button', { name: 'Disable', exact: true }).click();
    await expect(row.getByRole('status').filter({ hasText: 'Promotion disabled.' })).toBeVisible();
});
test('long product names, missing images, sold-out options and empty results remain usable', async ({ page }) => {
    const id = '70000000-0000-4000-8000-000000000001';
    const name = 'Local test garment with a deliberately long descriptive product name for narrow screens';
    localSQL(`insert into products(id,name,slug,sku,base_price,status,audience) values('${id}','${name}','browser-unavailable','BROWSER-UNAVAILABLE',1000,'active','unisex'); insert into product_variants(product_id,sku,color,size,stock_quantity) values('${id}','BROWSER-ZERO','Black','Free Size',0)`);
    try {
        await page.setViewportSize({ width: 360, height: 844 });
        await page.goto('/products/browser-unavailable');
        await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sold out', exact: true }).first()).toBeDisabled();
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
        await settle(page);
        expect(await page.locator('img').evaluateAll(images => images.every(image => image.complete))).toBe(true);
        await page.goto('/products?q=NoSuchBrowserTestGarment');
        await expect(page.getByRole('heading', { name: 'No matching pieces', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Browse all products', exact: true }).click();
        await expect(page).toHaveURL(/\/products$/);
    }
    finally {
        localSQL(`delete from products where id='${id}'`);
    }
});
test('responsive visual and accessibility inspection captures both surfaces', async ({ page }) => {
    test.setTimeout(240000);
    await login(page);
    fs.mkdirSync('.impeccable/review', { recursive: true });
    const records = [];
    for (const width of [360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const [name, url] of [['store', '/'], ['admin', '/admin/website']]) {
            await page.goto(url);
            await settle(page);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
            expect(overflow, `${name} overflow at ${width}`).toBe(false);
            await page.screenshot({ path: `.impeccable/review/${name}-${width}.png`, fullPage: true });
            records.push({ surface: name, width, overflow });
            if (name === 'store' && [390, 1440].includes(width))
                await page.screenshot({ path: `.impeccable/review/${width === 1440 ? 'desktop' : 'mobile'}.png` });
        }
    }
    for (const [name, url] of [['collection', '/products'], ['product', '/products/noir-satin-column-dress'], ['checkout', '/checkout'], ['catalog', '/admin/products'], ['product-form', '/admin/products/new'], ['delivery', '/admin/delivery-zones'], ['promotions', '/admin/promotions'], ['orders', '/admin/orders'], ['content', '/admin/content'], ['newsletter', '/admin/newsletter']]) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(url);
        await settle(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${name} mobile overflow`).toBe(false);
        await page.screenshot({ path: `.impeccable/review/${name}-390.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/products');
    await page.addStyleTag({ content: 'html{font-size:20px}' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    fs.writeFileSync('.impeccable/review/browser-report.json', JSON.stringify({ fixture: 'local PostgreSQL + test Auth shim', records }, null, 2));
});
