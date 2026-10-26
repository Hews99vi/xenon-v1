// Test-only Auth shim in front of real local PostgREST/PostgreSQL.
// No production credentials, customer records, or hosted database writes are used.
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
const database = process.env.XENON_BROWSER_DATABASE || 'postgresql://127.0.0.1:55439/xenon_browser';
const target = new URL(database);
const authPort = Number(process.env.XENON_FIXTURE_AUTH_PORT || 54339);
const restPort = Number(process.env.XENON_FIXTURE_REST_PORT || 54340);
const appPort = Number(process.env.XENON_BROWSER_PORT || 3000);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !/^\/xenon_browser(?:_[a-z0-9]+)?$/.test(target.pathname))
    throw new Error('Only a disposable local xenon_browser database is allowed.');
const secret = 'xenon-local-browser-tests-only-secret-2026';
const userId = '10000000-0000-4000-8000-000000000001';
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'editor@example.test', email_confirmed_at: new Date().toISOString(), created_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'Test editor' }, identities: [] };
function token(role, sub) { const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const payload = Buffer.from(JSON.stringify({ aud: 'authenticated', role, sub, iss: 'xenon-local-fixture', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 14400 })).toString('base64url'); const body = `${header}.${payload}`; return `${body}.${crypto.createHmac('sha256', secret).update(body).digest('base64url')}`; }
const anon = token('anon'), service = token('service_role'), access = token('authenticated', userId);
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const docs = JSON.parse(fs.readFileSync('tests/browser/content-fixture.json', 'utf8'));
const galleryId = '80000000-0000-4000-8000-000000000001';
const storage = new Map(['a','b','c'].map(letter => [`products/browser-${letter}.png`,fs.readFileSync('public/images/hero.png')]));
let failDeletes = 0, failUploadAfter = -1;
function sqlCommand(statement) {
    const result = spawnSync('psql',['-X','-At','-v','ON_ERROR_STOP=1','-d',database,'-c',statement],{encoding:'utf8'});
    if(result.status!==0) throw new Error(result.stderr);
    return result.stdout.trim();
}
const sql = `
create or replace function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role',current_user) $$;
insert into auth.users(id) values('${userId}') on conflict do nothing;
insert into admin_profiles(id,full_name,role) values('${userId}','Test editor','admin') on conflict(id) do nothing;
update products set audience='unisex';update categories set audience='unisex';
${docs.map(doc => `select import_content_document(${literal(doc.key)},${literal(doc.kind)},${literal(doc.slug)},${literal(JSON.stringify(doc.payload))}::jsonb,true);`).join('\n')}
insert into products(id,name,slug,sku,base_price,status) values('${galleryId}','Gallery browser fixture','gallery-browser-fixture','BROWSER-GALLERY',1000,'active');
insert into product_variants(product_id,sku,size,stock_quantity) values('${galleryId}','BROWSER-GALLERY-FS','Free Size',5);
${['a','b','c'].map((letter,i)=>`insert into storage.objects(bucket_id,name) values('product-images','products/browser-${letter}.png'); insert into product_images(product_id,image_url,alt_text,sort_order,is_primary) values('${galleryId}','http://127.0.0.1:${authPort}/storage/v1/object/public/product-images/products/browser-${letter}.png','Fixture photograph ${letter.toUpperCase()}',${i},${i===0});`).join('\n')}
insert into delivery_zones(id,name,district,delivery_fee,is_active) values('40000000-0000-4000-8000-000000000001','Test District','Test District',250,true) on conflict(id) do nothing;
insert into promo_codes(id,code,discount_type,discount_value,minimum_order_amount,is_active) values('50000000-0000-4000-8000-000000000001','BROWSER10','percentage',10,0,true) on conflict(code) do nothing;
`;
fs.writeFileSync('.impeccable/build/browser-fixture.sql', sql);
const seed = spawnSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', database, '-f', '.impeccable/build/browser-fixture.sql'], { encoding: 'utf8' });
if (seed.status !== 0)
    throw new Error(seed.stderr);
fs.writeFileSync('.impeccable/build/postgrest.conf', `db-uri = "${database}"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${secret}"\nserver-host = "127.0.0.1"\nserver-port = ${restPort}\n`);
const rest = spawn('postgrest', ['.impeccable/build/postgrest.conf'], { stdio: ['ignore', 'ignore', 'inherit'] });
fs.writeFileSync('.impeccable/build/fixture-env.json', JSON.stringify({ NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${authPort}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service, NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${appPort}`, RESEND_API_KEY: '', RESEND_FROM_EMAIL: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '' }, null, 2));
const server = http.createServer(async (req, res) => {
    try {
        const chunks = [];
        for await (const chunk of req)
            chunks.push(chunk);
        const body = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/json');
        if (req.url.startsWith('/auth/v1/token')) {
            const data = JSON.parse(body.toString() || '{}');
            if (data.email !== 'editor@example.test' || data.password !== 'fixture-password') {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid test credentials' }));
                return;
            }
            res.end(JSON.stringify({ access_token: access, token_type: 'bearer', refresh_token: 'local-fixture-refresh', expires_in: 14400, expires_at: Math.floor(Date.now() / 1000) + 14400, user }));
            return;
        }
        if (req.url === '/auth/v1/user') {
            if (req.headers.authorization !== `Bearer ${access}`) {
                res.writeHead(401);
                res.end(JSON.stringify({ message: 'Invalid fixture session' }));
                return;
            }
            res.end(JSON.stringify(user));
            return;
        }
        if (req.url.startsWith('/auth/v1/logout')) {
            res.writeHead(204);
            res.end();
            return;
        }
        if (req.url === '/__fixture/reset-gallery' && req.method==='POST' && req.headers['x-xenon-fixture']==='local-browser-only') {
            failDeletes=0;failUploadAfter=-1;
            sqlCommand(`delete from product_images where product_id='${galleryId}'; delete from product_image_cleanup_jobs where product_id='${galleryId}' or asset_key like 'product-images/products/browser-%'; delete from content_revisions where payload ? 'browserFixtureAsset'; delete from storage.objects o where bucket_id='product-images' and not public.product_asset_referenced(o.bucket_id || '/' || o.name);`);
            const kept=new Set(sqlCommand("select name from storage.objects where bucket_id='product-images'").split('\n'));
            for(const name of storage.keys())if(!kept.has(name))storage.delete(name);
            for(const [i,letter] of ['a','b','c'].entries()){
                const name=`products/browser-${letter}.png`;
                storage.set(name,fs.readFileSync('public/images/hero.png'));
                sqlCommand(`insert into storage.objects(bucket_id,name) select 'product-images',${literal(name)} where not exists(select 1 from storage.objects where bucket_id='product-images' and name=${literal(name)}); insert into product_images(product_id,image_url,alt_text,sort_order,is_primary) values('${galleryId}','http://127.0.0.1:${authPort}/storage/v1/object/public/product-images/${name}','Fixture photograph ${letter.toUpperCase()}',${i},${i===0})`);
            }
            res.end('{}');return;
        }
        if (req.url === '/__fixture/storage-failure' && req.method === 'POST' && req.headers['x-xenon-fixture']==='local-browser-only') {
            const options=JSON.parse(body.toString()); failDeletes=options.deletes||0;failUploadAfter=options.uploadAfter??-1;
            res.end('{}');return;
        }
        const publicPrefix='/storage/v1/object/public/product-images/';
        if (req.url.startsWith(publicPrefix) && req.method==='GET') {
            const name=decodeURIComponent(req.url.slice(publicPrefix.length).split('?')[0]);
            if(!storage.has(name)){res.writeHead(404);res.end('{}');return;}
            res.setHeader('Content-Type','image/png');res.end(storage.get(name));return;
        }
        if (req.url.startsWith('/storage/v1/object/') && !req.url.startsWith('/storage/v1/object/list/')) {
            if(req.headers.authorization!==`Bearer ${access}`){res.writeHead(401);res.end('{}');return;}
            if(req.method==='POST' && req.url.startsWith('/storage/v1/object/product-images/')) {
                if(failUploadAfter===0){failUploadAfter=-1;res.writeHead(503);res.end(JSON.stringify({message:'Fixture upload failure'}));return;}
                if(failUploadAfter>0)failUploadAfter--;
                const name=decodeURIComponent(req.url.slice('/storage/v1/object/product-images/'.length));
                const form=await new Request(`http://127.0.0.1${req.url}`,{method:'POST',headers:req.headers,body}).formData();
                const file=[...form.values()].find(value=>value instanceof File);
                if(!file){res.writeHead(400);res.end('{}');return;}
                sqlCommand(`insert into storage.objects(bucket_id,name) values('product-images',${literal(name)})`);
                storage.set(name,Buffer.from(await file.arrayBuffer()));
                res.end(JSON.stringify({Key:`product-images/${name}`,Id:crypto.randomUUID()}));return;
            }
            if(req.method==='DELETE' && req.url==='/storage/v1/object/product-images') {
                if(failDeletes>0){failDeletes--;res.writeHead(503);res.end(JSON.stringify({message:'Fixture delete failure'}));return;}
                const {prefixes}=JSON.parse(body.toString());
                try {
                    sqlCommand(`delete from storage.objects where bucket_id='product-images' and name in (${prefixes.map(literal).join(',')})`);
                    prefixes.forEach(name=>storage.delete(name));
                    res.end(JSON.stringify(prefixes.map(name=>({name}))));
                }catch {res.writeHead(409);res.end(JSON.stringify({message:'Image retained by database guard'}));}
                return;
            }
        }
        if (req.url.startsWith('/storage/v1/object/list/')) {
            res.end('[]');
            return;
        }
        if (req.url === '/health') {
            res.end(JSON.stringify({ fixture: true, database: 'disposable local PostgreSQL', auth: 'test shim' }));
            return;
        }
        if (!req.url.startsWith('/rest/v1/')) {
            res.writeHead(404);
            res.end('{}');
            return;
        }
        const headers = { ...req.headers };
        delete headers.host;
        delete headers.connection;
        delete headers['content-length'];
        const response = await fetch(`http://127.0.0.1:${restPort}${req.url.replace('/rest/v1', '')}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
        res.writeHead(response.status, Object.fromEntries([...response.headers].filter(([key]) => !['connection', 'transfer-encoding', 'content-encoding', 'content-length'].includes(key))));
        res.end(Buffer.from(await response.arrayBuffer()));
    }
    catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ message: 'Local fixture request failed' }));
        console.error(error.message);
    }
});
server.listen(authPort, '127.0.0.1', () => console.log(`Browser fixture ready at http://127.0.0.1:${authPort} (local database + test-only Auth).`));
function stop() { server.close(); rest.kill('SIGTERM'); }
process.on('SIGTERM', stop);
process.on('SIGINT', () => { stop(); process.exit(0); });
