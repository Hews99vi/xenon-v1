begin;
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
insert into admin_profiles(id,full_name,role) values ('10000000-0000-4000-8000-000000000001','Test editor','admin');
insert into products(id,name,slug,sku,status,base_price,audience) values
 ('20000000-0000-4000-8000-000000000001','Test women product','test-women','TEST-WOMEN','active',2000,'women'),
 ('20000000-0000-4000-8000-000000000002','Test men product','test-men','TEST-MEN','active',2000,'men'),
 ('20000000-0000-4000-8000-000000000003','Test unisex product','test-unisex','TEST-UNISEX','active',2000,'unisex'),
 ('20000000-0000-4000-8000-000000000004','Test unassigned product','test-unassigned','TEST-ALL','active',2000,null);
insert into product_variants(id,product_id,sku,stock_quantity,size) values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','TEST-VARIANT',8,'M');
insert into storage.objects(bucket_id,name) values ('banner-images','website/test-retained.jpg');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select save_content_draft('page:test-page','page','test-page','{"version":1,"title":"Test page","body":"Live copy","image":{"src":"https://example.supabase.co/storage/v1/object/public/banner-images/website/test-retained.jpg"}}',null) as first_revision \gset
select id as doc_id from content_documents where key='page:test-page' \gset
select test_assert(has_site_document()=false,'Site is uninitialized before import');
select test_assert((select published_revision_id is null from content_documents where id=:'doc_id'),'Saving does not publish');
select expect_error($q$insert into content_revisions(document_id,payload) values ('00000000-0000-0000-0000-000000000000','{}')$q$,'permission denied');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select test_assert((select count(*)=0 from content_documents),'Anonymous cannot see unpublished documents');
select test_assert((select count(*)=0 from content_revisions),'Anonymous cannot read draft payloads');
select expect_error($q$select save_content_draft('page:hack','page','hack','{"version":1}',null)$q$,'permission denied');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select expect_error($q$select save_content_draft('page:hack','page','hack','{"version":1}',null)$q$,'Admin access required');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select publish_content(:'doc_id',:'first_revision');
select save_content_draft('page:test-page','page','test-page','{"version":1,"title":"Test page","body":"Secret draft"}',:'first_revision') as second_revision \gset
select expect_error(format('select save_content_draft(%L,%L,%L,%L,%L)','page:test-page','page','test-page','{"version":1}',:'first_revision'),'CONTENT_CONFLICT');
select expect_error(format('select publish_content(%L,%L)',:'doc_id',:'first_revision'),'CONTENT_CONFLICT');
select test_assert((select published_revision_id=:'first_revision' from content_documents where id=:'doc_id'),'Conflict leaves publication unchanged');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select test_assert((select count(*)=1 from content_revisions),'Only current published revision is public');
select test_assert((select payload->>'body'='Live copy' from content_revisions),'Draft save keeps live copy');
select test_assert((select count(*)=2 from products where slug like 'test-%' and audience in ('women','unisex')),'Women includes unisex, excludes unassigned');
select test_assert((select count(*)=2 from products where slug like 'test-%' and audience in ('men','unisex')),'Men includes unisex');
select test_assert((select count(*)=4 from products where slug like 'test-%'),'All products keeps unassigned');
select test_assert(storefront_filter_options(null,'Test women','women')->'sizes'='["M"]'::jsonb,'Filter options use audience and search');
select test_assert(storefront_filter_options(null,'Test women','men')->'sizes'='[]'::jsonb,'Filter options exclude other audiences');
select expect_error($q$select checkout_transaction('{}')$q$,'permission denied');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select publish_content(:'doc_id',:'second_revision');
select restore_content_draft(:'doc_id',:'first_revision',:'second_revision') as restored_revision \gset
select test_assert((select published_revision_id=:'second_revision' from content_documents where id=:'doc_id'),'Restore creates draft without publishing');
select publish_content(:'doc_id',:'restored_revision');
select test_assert((select count(*)=3 from content_revisions),'History retained after restoration');
select test_assert((select count(*)=1 from retained_content_assets(array['https://example.supabase.co/storage/v1/object/public/banner-images/website/test-retained.jpg'])),'Historical image retained');
select expect_error($q$delete from storage.objects where name='website/test-retained.jpg'$q$,'Image is retained');
select expect_error($q$update storage.objects set name='renamed.jpg' where name='website/test-retained.jpg'$q$,'Image is retained');
select test_assert((select stock_quantity=8 from product_variants where sku='TEST-VARIANT'),'Content restore does not restore stock');
select test_assert((select base_price=2000 from products where sku='TEST-WOMEN'),'Content restore does not restore price');
select save_content_draft('site','site','site','{"version":1}',null);
select test_assert(has_site_document(),'Unpublished site is distinguished from legacy mode');
select expect_error($q$update banners set title='Bypass' where id=(select id from banners limit 1)$q$,'Use the Website editor');
reset role;
-- Cross-document pointer integrity and migration idempotence.
select expect_error(format('update content_documents set published_revision_id=%L where key=%L',:'first_revision','site'),'foreign key');
select test_assert(import_content_document('page:test-page','page','test-page','{"version":1}',true) is null,'Import never overwrites an existing document');
-- Transactional COD checkout uses current prices, stock, discounts and district fees.
insert into delivery_zones(id,name,district,delivery_fee) values ('40000000-0000-4000-8000-000000000001','Test district','Test district',250);
insert into promo_codes(code,discount_type,discount_value,minimum_order_amount,usage_limit) values ('TEST10','percentage',10,0,10);
select expect_error($q$select checkout_transaction('{"order_number":"TEST-FAIL","payment_method":"cod","delivery_zone_id":"40000000-0000-4000-8000-000000000001","items":[{"product_id":"20000000-0000-4000-8000-000000000001","variant_id":"30000000-0000-4000-8000-000000000001","quantity":999}]}')$q$,'insufficient_stock');
select test_assert((select stock_quantity=8 from product_variants where sku='TEST-VARIANT'),'Failed checkout leaves stock intact');
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select checkout_transaction('{"order_number":"TEST-COD","payment_method":"cod","customer_email":"test@example.com","customer_phone":"0771234567","customer_first_name":"Test","customer_last_name":"Customer","shipping_address_line1":"Test address","shipping_city":"Test city","delivery_zone_id":"40000000-0000-4000-8000-000000000001","promo_code":"TEST10","items":[{"product_id":"20000000-0000-4000-8000-000000000001","variant_id":"30000000-0000-4000-8000-000000000001","quantity":2}]}');
select test_assert((select grand_total=3850 and subtotal=4000 and discount_total=400 and delivery_fee=250 from orders where order_number='TEST-COD'),'COD total uses live values');
select test_assert((select stock_quantity=6 from product_variants where sku='TEST-VARIANT'),'Checkout reserves stock');
select test_assert((select used_count=1 from promo_codes where code='TEST10'),'Promotion applied once');
select release_order_stock((select id from orders where order_number='TEST-COD'),null,true,'cancelled');
select release_order_stock((select id from orders where order_number='TEST-COD'),null,true,'cancelled');
select test_assert((select stock_quantity=8 from product_variants where sku='TEST-VARIANT'),'Cancellation releases stock only once');
rollback;
