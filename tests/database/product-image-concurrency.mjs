// Uses the disposable test database and its Storage metadata fixture only.
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const literal = value => `'${String(value).replaceAll("'", "''")}'`;

export async function testProductImageConcurrency(database) {
  function query(sql) {
    const result = spawnSync('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-d', database, '-c', sql], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  }
  function connection(name) {
    const url = new URL(database); url.searchParams.set('application_name', name);
    const child = spawn('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-d', url.href]);
    let output = '', errors = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { errors += data; });
    const done = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => resolve({ code, output, errors }));
    });
    return {
      child, done,
      async marker(value) {
        const deadline = Date.now() + 10000;
        while (!output.includes(value)) {
          if (child.exitCode !== null || Date.now() > deadline) throw new Error(`Session did not reach ${value}: ${errors}`);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      },
    };
  }
  async function blocked(name) {
    const deadline = Date.now() + 10000;
    while (query(`select exists(select 1 from pg_stat_activity where datname=current_database() and application_name=${literal(name)} and wait_event_type='Lock')`) !== 't') {
      if (Date.now() > deadline) throw new Error(`${name} did not wait for the media transaction lock`);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }
  const pid = '90000000-0000-4000-8000-000000000001';
  const iid = '90000000-0000-4000-8000-000000000002';
  const admin = `set role authenticated; set "request.jwt.claim.sub"='10000000-0000-4000-8000-000000000001';`;
  query(`insert into auth.users(id) values('10000000-0000-4000-8000-000000000001');
    insert into admin_profiles(id,full_name,role) values('10000000-0000-4000-8000-000000000001','Concurrency fixture','admin');
    insert into products(id,category_id,name,slug,sku,base_price,status) select '${pid}',id,'Concurrent images','concurrent-images','CONCURRENT-IMAGES',1000,'active' from categories limit 1;
    insert into product_variants(product_id,sku,stock_quantity) values('${pid}','CONCURRENT-IMAGE-VARIANT',5);
    insert into storage.objects(bucket_id,name) values('product-images','products/concurrent.png'),('product-images','products/shared-race.png'),('product-images','products/deleted-race.png');
    insert into product_images(id,product_id,image_url,is_primary) values('${iid}','${pid}','https://fixture.supabase.co/storage/v1/object/public/product-images/products/concurrent.png',true)`);
  const expected = query(`${admin} select product_image_snapshot('${pid}')`);
  const product = query(`select jsonb_build_object('category_id',category_id,'name',name,'slug',slug,'sku',sku,'base_price',base_price,'status',status) from products where id='${pid}'`);
  const variants = query(`select jsonb_agg(to_jsonb(v)) from product_variants v where product_id='${pid}'`);
  const save = alt => `${admin} select admin_upsert_product_v2('${pid}',${literal(product)},${literal(JSON.stringify([{ id: iid, image_url: 'https://fixture.supabase.co/storage/v1/object/public/product-images/products/concurrent.png', alt_text: alt }]))},${literal(variants)},${literal(expected)});`;
  const sessions = [];
  try {
    const first = connection('image_save_first'); sessions.push(first);
    first.child.stdin.write(`begin; ${save('First editor')} select 'FIRST_SAVED';\n`);
    await first.marker('FIRST_SAVED');
    const second = connection('image_save_second'); sessions.push(second);
    second.child.stdin.end(save('Second editor'));
    await blocked('image_save_second');
    first.child.stdin.end('commit;\n');
    assert.equal((await first.done).code, 0);
    assert.match((await second.done).errors, /PRODUCT_IMAGES_CONFLICT/);
    assert.equal(query(`select alt_text from product_images where id='${iid}'`), 'First editor');

    const reuse = connection('image_reuse_first'); sessions.push(reuse);
    reuse.child.stdin.write(`begin; insert into product_images(product_id,image_url) values('${pid}','https://fixture.supabase.co/storage/v1/object/public/product-images/products/shared-race.png'); select 'REFERENCED';\n`);
    await reuse.marker('REFERENCED');
    const cleanup = connection('image_cleanup_second'); sessions.push(cleanup);
    cleanup.child.stdin.end("delete from storage.objects where name='products/shared-race.png'");
    await blocked('image_cleanup_second');
    reuse.child.stdin.end('commit;\n'); await reuse.done;
    assert.match((await cleanup.done).errors, /Image is retained/);

    const deletion = connection('image_delete_first'); sessions.push(deletion);
    deletion.child.stdin.write("begin; delete from storage.objects where name='products/deleted-race.png'; select 'DELETED';\n");
    await deletion.marker('DELETED');
    const staleReuse = connection('image_reuse_second'); sessions.push(staleReuse);
    staleReuse.child.stdin.end(`insert into product_images(product_id,image_url) values('${pid}','https://fixture.supabase.co/storage/v1/object/public/product-images/products/deleted-race.png')`);
    await blocked('image_reuse_second');
    deletion.child.stdin.end('commit;\n'); await deletion.done;
    assert.match((await staleReuse.done).errors, /IMAGE_ALREADY_REMOVED/);
    console.log('Passed: concurrent gallery saves and both reference/deletion race orders.');
  } finally {
    sessions.forEach(session => { if (session.child.exitCode === null) session.child.kill('SIGTERM'); });
    await Promise.allSettled(sessions.map(session => session.done));
  }
}
