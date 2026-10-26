-- Storage metadata below is a fixture, not a hosted Storage deletion procedure.
begin;
insert into auth.users(id) values('10000000-0000-4000-8000-000000000001');
insert into admin_profiles(id,full_name,role) values('10000000-0000-4000-8000-000000000001','Image test admin','admin');
insert into storage.objects(bucket_id,name) values
 ('product-images','products/image-a.png'),('product-images','products/image-b.png'),
 ('product-images','products/image-c.png'),('product-images','products/image-new.png'),
 ('product-images','products/image with space.png');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select jsonb_build_object('category_id',id,'name','Image fixture','slug','image-fixture','sku','IMAGE-FIXTURE','base_price',1000,'status','active') as product_payload from categories limit 1 \gset
select '[{"sku":"IMAGE-VARIANT","size":"M","stock_quantity":10,"price":1000,"is_active":true}]' as variants_payload \gset
select admin_upsert_product_v2(null,:'product_payload'::jsonb,
 '[{"image_url":"https://fixture.supabase.co/storage/v1/object/public/product-images/products/image-a.png","alt_text":"A"},{"image_url":"https://fixture.supabase.co/storage/v1/object/public/product-images/products/image-b.png","alt_text":"B"},{"image_url":"https://fixture.supabase.co/storage/v1/object/public/product-images/products/image-c.png","alt_text":"C"}]',
 :'variants_payload'::jsonb,'[]') as first_save \gset
select :'first_save'::jsonb->>'product_id' as product_id,
  :'first_save'::jsonb->'images' as initial_images, :'first_save'::jsonb->'snapshot' as initial_snapshot,
  :'first_save'::jsonb->'images'->0->>'id' as image_a, :'first_save'::jsonb->'images'->1->>'id' as image_b \gset
select jsonb_agg(to_jsonb(v)) as variants_payload from product_variants v where product_id=:'product_id' \gset
select test_assert((select count(*)=3 and count(*) filter(where is_primary)=1 from product_images where product_id=:'product_id'),'Creation stores gallery with one main image');
select admin_upsert_product_v2(:'product_id',:'product_payload',:'initial_images',:'variants_payload',:'initial_snapshot');
select test_assert(product_image_snapshot(:'product_id')=:'initial_snapshot'::jsonb,'Unchanged save preserves IDs and gallery');
select expect_error(format('select admin_upsert_product_v2(%L,%L,%L,%L,%L)',:'product_id',:'product_payload','[{"id":"00000000-0000-4000-8000-000000000000","image_url":"https://example.com/a.png"}]',:'variants_payload',:'initial_snapshot'),'image_not_found');
update product_images set alt_text='Concurrent edit' where id=:'image_a';
select expect_error(format('select admin_upsert_product_v2(%L,%L,%L,%L,%L)',:'product_id',:'product_payload',:'initial_images',:'variants_payload',:'initial_snapshot'),'PRODUCT_IMAGES_CONFLICT');
select product_image_snapshot(:'product_id') as latest_snapshot \gset
select jsonb_build_array(
 jsonb_build_object('id',:'image_b','image_url','https://fixture.supabase.co/storage/v1/object/public/product-images/products/image-new.png','alt_text','Replacement'),
 jsonb_build_object('id',:'image_a','image_url','https://fixture.supabase.co/storage/v1/object/public/product-images/products/image-a.png','alt_text','A revised')
) as edited_images \gset
select admin_upsert_product_v2(:'product_id',:'product_payload',:'edited_images',:'variants_payload',:'latest_snapshot');
select test_assert((select is_primary and sort_order=0 and alt_text='Replacement' from product_images where id=:'image_b'),'Replacement retains ID and becomes main');
select test_assert((select count(*)=2 from product_images where product_id=:'product_id'),'Removed image detached');
select test_assert((select count(*)=2 from product_image_cleanup_jobs where state='pending'),'Detached originals queued atomically');
select test_assert(product_image_cleanup_allowed('product-images/products/image-b.png'),'Unused original eligible');
reset role;
delete from storage.objects where name='products/image-b.png';
select expect_error(format('insert into product_images(product_id,image_url) values(%L,%L)',:'product_id','https://fixture.supabase.co/storage/v1/object/public/product-images/products/image-b.png'),'IMAGE_ALREADY_REMOVED');
insert into policy_pages(title,slug,content) values('Legacy reference','image-reference','<img src="https://fixture.supabase.co/storage/v1/object/public/product-images/products/image-c.png">');
select expect_error($q$delete from storage.objects where name='products/image-c.png'$q$,'Image is retained');
insert into categories(name,slug,image_url) values('Shared photograph','shared-photo','https://fixture.supabase.co/storage/v1/object/public/product-images/products/image%20with%20space.png');
select expect_error($q$delete from storage.objects where name='products/image with space.png'$q$,'Image is retained');
select test_assert(public.product_asset_decode('Malformed %ff text then image%20with%20space.png')='Malformed %ff text then image with space.png','Unrelated invalid escapes do not hide encoded image references');
set local role authenticated;
select test_assert(not product_image_cleanup_allowed('product-images/products/image-c.png'),'Legacy reference retained');
select test_assert((select state='retained' from product_image_cleanup_jobs where asset_key='product-images/products/image-c.png'),'Retained original is not an endless retry');
select product_image_snapshot(:'product_id') as latest_snapshot \gset
select expect_error(format('select admin_upsert_product_v2(%L,%L,%L,%L,%L)',:'product_id',:'product_payload','[]','[{"sku":"XEN-EVE-001-BLK-M","size":"M","stock_quantity":1}]',:'latest_snapshot'),'duplicate key');
select test_assert(product_image_snapshot(:'product_id')=:'latest_snapshot'::jsonb,'Variant failure rolls back image mutations');
select admin_upsert_product_v2(:'product_id',:'product_payload','[]',:'variants_payload',:'latest_snapshot');
select test_assert((select count(*)=0 from product_images where product_id=:'product_id'),'All images may be removed');
select reserve_product_image_upload('https://fixture.supabase.co/storage/v1/object/public/product-images/products/abandoned.png',:'product_id');
select test_assert(not product_image_cleanup_allowed('product-images/products/abandoned.png'),'In-flight uploads are leased');
update product_image_cleanup_jobs set not_before=now()-interval '1 second' where asset_key='product-images/products/abandoned.png';
select test_assert(product_image_cleanup_allowed('product-images/products/abandoned.png'),'Abandoned uploads become eligible after lease expiry');
set local role anon;
select expect_error($q$select product_image_snapshot('00000000-0000-4000-8000-000000000000')$q$,'permission denied');
select expect_error($q$select product_image_cleanup_allowed('product-images/products/image-a.png')$q$,'permission denied');
reset role;
update admin_profiles set is_active=false where id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select expect_error($q$select product_image_snapshot('00000000-0000-4000-8000-000000000000')$q$,'not_authorized');
rollback;
