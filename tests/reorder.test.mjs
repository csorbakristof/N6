// Browser tests for task reordering. Run: node tests/reorder.test.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain', '.png': 'image/png' };

const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://x').pathname;
    const path = pathname === '/' ? '/index.html' : pathname;
    try {
        const body = await readFile(join(root, path));
        res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404).end();
    }
});
await new Promise(r => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let failed = 0;

async function freshPage(tasks) {
    const page = await browser.newPage();
    await page.addInitScript(([data]) => {
        if (!sessionStorage.getItem('seeded')) {
            localStorage.setItem('n6_app_data', JSON.stringify(data));
            sessionStorage.setItem('seeded', '1');
        }
    }, [{
        tasks: tasks.map((text, i) => ({ id: `t${i + 1}`, text, completed: false })),
        methodologies: [],
        lastActiveDate: new Date().toISOString().split('T')[0],
        currentReminder: { id: null, text: '', read: true }
    }]);
    await page.goto(url);
    return page;
}

const texts = page => page.$$eval('.task-input', els => els.map(e => e.value));
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('n6_app_data')).tasks.map(t => t.text));

async function test(name, fn) {
    try {
        await fn();
        console.log(`ok - ${name}`);
    } catch (e) {
        failed++;
        console.log(`not ok - ${name}\n${e.message}`);
    }
}

const six = ['A', 'B', 'C', 'D', 'E', 'F'];

await test('Alt+ArrowUp moves a task up and keeps focus on it', async () => {
    const page = await freshPage(six);
    await page.focus('.task-input[data-index="2"]');
    await page.keyboard.press('Alt+ArrowUp');
    assert.deepEqual(await texts(page), ['A', 'C', 'B', 'D', 'E', 'F']);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.index), '1');
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Alt+ArrowUp'); // already at top: no-op
    assert.deepEqual(await stored(page), ['C', 'A', 'B', 'D', 'E', 'F']);
});

await test('Alt+ArrowDown keeps unsaved typed text', async () => {
    const page = await freshPage(six);
    await page.fill('.task-input[data-index="0"]', 'A edited');
    await page.keyboard.press('Alt+ArrowDown');
    assert.deepEqual(await stored(page), ['B', 'A edited', 'C', 'D', 'E', 'F']);
});

await test('dragging the handle moves a task to the drop slot', async () => {
    const page = await freshPage(six);
    const handle = await page.$('.drag-handle[data-index="4"]').then(h => h.boundingBox());
    const target = await page.$$('.task-item').then(items => items[1].boundingBox());
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2, target.y + target.height / 2, { steps: 5 });
    assert.equal(await page.$$eval('.task-item.drop-target', els => els.length), 1);
    await page.mouse.up();
    assert.deepEqual(await stored(page), ['A', 'E', 'B', 'C', 'D', 'F']);
    assert.equal(await page.$$eval('.task-item.dragging, .task-item.drop-target', els => els.length), 0);
});

await test('completed state moves with the task and survives reload', async () => {
    const page = await freshPage(six);
    await page.check('.task-checkbox[data-index="0"]');
    await page.focus('.task-input[data-index="0"]');
    await page.keyboard.press('Alt+ArrowDown');
    assert.deepEqual(await page.$$eval('.task-checkbox', els => els.map(e => e.checked)), [false, true, false, false, false, false]);
    await page.reload();
    assert.deepEqual(await texts(page), ['B', 'A', 'C', 'D', 'E', 'F']);
});

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
