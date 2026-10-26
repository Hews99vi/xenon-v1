-- Existing databases: qualify delivery columns to avoid PL/pgSQL variable ambiguity.
create or replace function public.checkout_transaction(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  item_quantity integer;
  item_product_id uuid;
  item_variant_id uuid;
  requested_item record;
  variant_row record;
  delivery_row record;
  promo_row record;
  order_id uuid;
  promo_id uuid := null;
  order_number text := nullif(trim(payload->>'order_number'), '');
  promo_code text := nullif(upper(trim(coalesce(payload->>'promo_code', ''))), '');
  subtotal numeric(12, 2) := 0;
  discount_total numeric(12, 2) := 0;
  delivery_fee numeric(12, 2) := 0;
  grand_total numeric(12, 2) := 0;
begin
  if order_number is null then
    raise exception 'order_number_required';
  end if;

  if payload->>'payment_method' <> 'cod' then
    raise exception 'unsupported_payment_method';
  end if;

  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'cart_empty';
  end if;

  select dz.id, dz.name, dz.city, dz.district, dz.delivery_fee
  into delivery_row
  from public.delivery_zones dz
  where dz.id = (payload->>'delivery_zone_id')::uuid
    and dz.is_active = true;

  if not found then
    raise exception 'delivery_zone_not_found';
  end if;

  delivery_fee := round(delivery_row.delivery_fee, 2);

  create temporary table if not exists checkout_requested_items (
    product_id uuid not null,
    variant_id uuid not null,
    quantity integer not null
  ) on commit drop;

  create temporary table if not exists checkout_requested_items_merged (
    product_id uuid not null,
    variant_id uuid not null,
    quantity integer not null
  ) on commit drop;

  create temporary table if not exists checkout_order_items (
    product_id uuid not null,
    variant_id uuid not null,
    product_name text not null,
    product_sku text,
    variant_color text,
    variant_size text,
    quantity integer not null,
    unit_price numeric(12, 2) not null,
    line_total numeric(12, 2) not null
  ) on commit drop;

  truncate table checkout_requested_items;
  truncate table checkout_requested_items_merged;
  truncate table checkout_order_items;

  for item in select * from jsonb_array_elements(payload->'items')
  loop
    item_quantity := (item->>'quantity')::integer;
    item_product_id := (item->>'product_id')::uuid;
    item_variant_id := (item->>'variant_id')::uuid;

    if item_quantity is null or item_quantity <= 0 then
      raise exception 'invalid_quantity';
    end if;

    insert into checkout_requested_items (
      product_id,
      variant_id,
      quantity
    )
    values (
      item_product_id,
      item_variant_id,
      item_quantity
    );
  end loop;

  insert into checkout_requested_items_merged (
    product_id,
    variant_id,
    quantity
  )
  select
    product_id,
    variant_id,
    sum(quantity)::integer
  from checkout_requested_items
  group by product_id, variant_id;

  truncate table checkout_requested_items;

  insert into checkout_requested_items (
    product_id,
    variant_id,
    quantity
  )
  select
    product_id,
    variant_id,
    quantity
  from checkout_requested_items_merged;

  for requested_item in select * from checkout_requested_items
  loop
    item_quantity := requested_item.quantity;
    item_product_id := requested_item.product_id;
    item_variant_id := requested_item.variant_id;

    select
      pv.id as variant_id,
      pv.product_id,
      pv.color,
      coalesce(nullif(pv.size, ''), 'Free Size') as size,
      pv.sku,
      pv.price as variant_price,
      pv.stock_quantity,
      pv.is_active as variant_is_active,
      p.name as product_name,
      p.base_price,
      p.sale_price,
      p.status as product_status
    into variant_row
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = item_variant_id
      and pv.product_id = item_product_id
    for update of pv;

    if not found or not variant_row.variant_is_active or variant_row.product_status <> 'active' then
      raise exception 'cart_item_unavailable';
    end if;

    if variant_row.stock_quantity < item_quantity then
      raise exception 'insufficient_stock';
    end if;

    insert into checkout_order_items (
      product_id,
      variant_id,
      product_name,
      product_sku,
      variant_color,
      variant_size,
      quantity,
      unit_price,
      line_total
    )
    values (
      variant_row.product_id,
      variant_row.variant_id,
      variant_row.product_name,
      variant_row.sku,
      variant_row.color,
      variant_row.size,
      item_quantity,
      round(coalesce(variant_row.variant_price, variant_row.sale_price, variant_row.base_price), 2),
      round(coalesce(variant_row.variant_price, variant_row.sale_price, variant_row.base_price) * item_quantity, 2)
    );
  end loop;

  select round(coalesce(sum(line_total), 0), 2)
  into subtotal
  from checkout_order_items;

  if promo_code is not null then
    select *
    into promo_row
    from public.promo_codes
    where code = promo_code
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
    for update;

    if not found then
      raise exception 'promo_invalid';
    end if;

    if promo_row.usage_limit is not null and promo_row.used_count >= promo_row.usage_limit then
      raise exception 'promo_usage_limit_reached';
    end if;

    if subtotal < promo_row.minimum_order_amount then
      raise exception 'promo_minimum_not_met';
    end if;

    if promo_row.discount_type = 'percentage' then
      discount_total := round(subtotal * (promo_row.discount_value / 100), 2);
    else
      discount_total := round(promo_row.discount_value, 2);
    end if;

    if promo_row.max_discount_amount is not null then
      discount_total := least(discount_total, promo_row.max_discount_amount);
    end if;

    discount_total := least(discount_total, subtotal);

    update public.promo_codes
    set used_count = used_count + 1
    where id = promo_row.id;

    promo_id := promo_row.id;
  end if;

  grand_total := round(subtotal - discount_total + delivery_fee, 2);

  insert into public.orders (
    order_number,
    customer_email,
    customer_phone,
    customer_first_name,
    customer_last_name,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_district,
    shipping_postal_code,
    shipping_country,
    delivery_zone_id,
    promo_code_id,
    subtotal,
    discount_total,
    delivery_fee,
    tax_total,
    grand_total,
    currency,
    payment_method,
    payment_status,
    order_status,
    customer_notes
  )
  values (
    order_number,
    coalesce(nullif(trim(payload->>'customer_email'), ''), 'guest@xenon.local'),
    nullif(trim(payload->>'customer_phone'), ''),
    nullif(trim(payload->>'customer_first_name'), ''),
    nullif(trim(payload->>'customer_last_name'), ''),
    nullif(trim(payload->>'shipping_address_line1'), ''),
    nullif(trim(payload->>'shipping_address_line2'), ''),
    nullif(trim(payload->>'shipping_city'), ''),
    coalesce(nullif(trim(payload->>'shipping_district'), ''), delivery_row.district),
    nullif(trim(payload->>'shipping_postal_code'), ''),
    'Sri Lanka',
    delivery_row.id,
    promo_id,
    subtotal,
    discount_total,
    delivery_fee,
    0,
    grand_total,
    'LKR',
    payload->>'payment_method',
    'pending',
    'pending',
    nullif(trim(payload->>'customer_notes'), '')
  )
  returning id into order_id;

  insert into public.order_items (
    order_id,
    product_id,
    variant_id,
    product_name,
    product_sku,
    variant_color,
    variant_size,
    quantity,
    unit_price,
    line_total
  )
  select
    order_id,
    product_id,
    variant_id,
    product_name,
    product_sku,
    variant_color,
    variant_size,
    quantity,
    unit_price,
    line_total
  from checkout_order_items;

  update public.product_variants pv
  set stock_quantity = pv.stock_quantity - checkout_order_items.quantity
  from checkout_order_items
  where pv.id = checkout_order_items.variant_id;

  return jsonb_build_object(
    'order_id', order_id,
    'order_number', order_number,
    'subtotal', subtotal,
    'discount_total', discount_total,
    'delivery_fee', delivery_fee,
    'grand_total', grand_total
  );
end;
$$;

revoke execute on function public.checkout_transaction(jsonb) from public, anon, authenticated;
grant execute on function public.checkout_transaction(jsonb) to service_role;

