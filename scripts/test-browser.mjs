// A complete browser run against disposable local data; never loads .env files.
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, openSync, closeSync } from "node:fs";
import net from "node:net";
const maintenance = process.env.XENON_TEST_POSTGRES_URL;
if (!maintenance)
    throw new Error("Set XENON_TEST_POSTGRES_URL to a local PostgreSQL maintenance database. Requires psql, postgrest and installed Chrome.");
const target = new URL(maintenance);
if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname)) {
    throw new Error("Browser tests only accept a disposable local PostgreSQL server.");
}
const database = `xenon_browser_${randomUUID().replaceAll("-", "")}`;
const env = {
    ...process.env,
    XENON_BROWSER_PORT: "3100",
    XENON_BROWSER_TEST: "1",
    XENON_FIXTURE_AUTH_PORT: "55339",
    XENON_FIXTURE_REST_PORT: "55340",
};
mkdirSync(".impeccable/build", { recursive: true });
mkdirSync(".impeccable/tmp", { recursive: true });
writeFileSync(".impeccable/build/browser-tsconfig.json", JSON.stringify({extends:"../../tsconfig.json", include:["../../next-env.d.ts","../../app/**/*.ts","../../app/**/*.tsx","../../components/**/*.tsx","../../lib/**/*.ts","../../.next/browser-tests/dev/types/**/*.ts"],exclude:["../../node_modules"]}));
env.TMPDIR = `${process.cwd()}/.impeccable/tmp`;
function sql(url, args) {
    const result = spawnSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", url, ...args], { encoding: "utf8" });
    if (result.status !== 0)
        throw new Error(result.error?.message || result.stderr);
}
async function requireFreePort(port) {
    await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", () => reject(new Error(`Local test port ${port} is already in use. Stop that test process first.`)));
        server.listen(Number(port), "127.0.0.1", () => server.close(resolve));
    });
}
async function ready(url, child) {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null)
            throw new Error(`Test server exited. Inspect .impeccable/build/browser-services.log.`);
        try {
            if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok)
                return;
        }
        catch { /* Startup is not yet complete. */ }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error(`Test server did not become ready: ${url}`);
}
async function stop(child) {
    if (!child || child.exitCode !== null)
        return;
    await new Promise(resolve => {
        child.once("exit", resolve);
        child.kill("SIGTERM");
        const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
        timeout.unref();
    });
}
let fixture, app, run, created = false;
const interrupt = () => { run?.kill("SIGTERM"); app?.kill("SIGTERM"); fixture?.kill("SIGTERM"); };
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);
const log = openSync(".impeccable/build/browser-services.log", "w");
try {
    for (const port of [env.XENON_BROWSER_PORT, env.XENON_FIXTURE_AUTH_PORT, env.XENON_FIXTURE_REST_PORT])
        await requireFreePort(port);
    sql(maintenance, ["-c", `CREATE DATABASE ${database}`]);
    created = true;
    target.pathname = `/${database}`;
    env.XENON_BROWSER_DATABASE = target.href;
    for (const file of ["tests/database/bootstrap.sql", "supabase/schema.sql", "supabase/checkout-transaction-fix.sql", "supabase/content-management.sql", "supabase/product-image-management.sql"]) {
        sql(target.href, ["-f", file]);
    }
    fixture = spawn(process.execPath, ["tests/browser/fixture-server.mjs"], { env, stdio: ["ignore", log, log] });
    await ready(`http://127.0.0.1:${env.XENON_FIXTURE_AUTH_PORT}/health`, fixture);
    const fixtureEnv = JSON.parse(readFileSync(".impeccable/build/fixture-env.json", "utf8"));
    app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", env.XENON_BROWSER_PORT], { env: { ...env, ...fixtureEnv }, stdio: ["ignore", log, log] });
    await ready(`http://127.0.0.1:${env.XENON_BROWSER_PORT}`, app);
    const result = await new Promise((resolve, reject) => {
        run = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], { env, stdio: "inherit" });
        run.once("error", reject);
        run.once("exit", code => resolve(code ?? 1));
    });
    process.exitCode = result;
}
finally {
    await stop(app);
    await stop(fixture);
    closeSync(log);
    if (created)
        sql(maintenance, ["-c", `DROP DATABASE ${database} WITH (FORCE)`]);
}
