-- Make product and child-row writes atomic for admin create/update actions.
-- Storage uploads remain outside the database transaction and are cleaned up by
-- the server action when this function fails.

create or replace function public.admin_upsert_product(
  p_product_id uuid,
  p_product jsonb,
  p_images jsonb,
  p_variants jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
  product_slug text;
  image_row record;
  variant_row record;
  next_image_sort_order integer;
  has_primary_image boolean;
begin
  if not public.is_active_admin() then
    raise exception 'not_authorized';
  end if;

  if jsonb_typeof(coalesce(p_product, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_variants, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_product_payload';
  end if;

  if p_product_id is null then
    insert into public.products (
      category_id,
      name,
      slug,
      description,
      short_description,
      base_price,
      sale_price,
      sku,
      status,
      is_featured,
      seo_title,
      seo_description
    )
    values (
      (p_product->>'category_id')::uuid,
      trim(p_product->>'name'),
      trim(p_product->>'slug'),
      nullif(trim(p_product->>'description'), ''),
      nullif(trim(p_product->>'short_description'), ''),
      (p_product->>'base_price')::numeric,
      nullif(trim(p_product->>'sale_price'), '')::numeric,
      trim(p_product->>'sku'),
      p_product->>'status',
      coalesce((p_product->>'is_featured')::boolean, false),
      nullif(trim(p_product->>'seo_title'), ''),
      nullif(trim(p_product->>'seo_description'), '')
    )
    returning id, slug into v_product_id, product_slug;
  else
    update public.products
    set
      category_id = (p_product->>'category_id')::uuid,
      name = trim(p_product->>'name'),
      slug = trim(p_product->>'slug'),
      description = nullif(trim(p_product->>'description'), ''),
      short_description = nullif(trim(p_product->>'short_description'), ''),
      base_price = (p_product->>'base_price')::numeric,
      sale_price = nullif(trim(p_product->>'sale_price'), '')::numeric,
      sku = trim(p_product->>'sku'),
      status = p_product->>'status',
      is_featured = coalesce((p_product->>'is_featured')::boolean, false),
      seo_title = nullif(trim(p_product->>'seo_title'), ''),
      seo_description = nullif(trim(p_product->>'seo_description'), '')
    where id = p_product_id
    returning id, slug into v_product_id, product_slug;

    if not found then
      raise exception 'product_not_found';
    end if;
  end if;

  select
    coalesce(max(sort_order) + 1, 0),
    coalesce(bool_or(is_primary), false)
  into next_image_sort_order, has_primary_image
  from public.product_images
  where public.product_images.product_id = v_product_id;

  for image_row in
    select *
    from jsonb_to_recordset(p_images) as image(image_url text, alt_text text)
  loop
    if nullif(trim(image_row.image_url), '') is null then
      raise exception 'invalid_product_image';
    end if;

    insert into public.product_images (
      product_id,
      image_url,
      alt_text,
      sort_order,
      is_primary
    )
    values (
      v_product_id,
      trim(image_row.image_url),
      nullif(trim(image_row.alt_text), ''),
      next_image_sort_order,
      not has_primary_image and next_image_sort_order = coalesce(next_image_sort_order, 0)
    );

    has_primary_image := true;
    next_image_sort_order := next_image_sort_order + 1;
  end loop;

  delete from public.product_variants existing_variant
  where existing_variant.product_id = v_product_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_variants) as submitted_variant(id uuid)
      where submitted_variant.id is not null
        and submitted_variant.id = existing_variant.id
    );

  for variant_row in
    select *
    from jsonb_to_recordset(p_variants) as variant(
      id uuid,
      color text,
      size text,
      sku text,
      price numeric,
      stock_quantity integer,
      is_active boolean
    )
  loop
    if nullif(trim(variant_row.sku), '') is null then
      raise exception 'invalid_variant_sku';
    end if;

    if variant_row.id is null then
      insert into public.product_variants (
        product_id,
        color,
        size,
        sku,
        price,
        stock_quantity,
        is_active
      )
      values (
        v_product_id,
        nullif(trim(variant_row.color), ''),
        coalesce(nullif(trim(variant_row.size), ''), 'Free Size'),
        trim(variant_row.sku),
        variant_row.price,
        variant_row.stock_quantity,
        coalesce(variant_row.is_active, true)
      );
    else
      if not exists (
        select 1
        from public.product_variants
        where id = variant_row.id
          and public.product_variants.product_id = v_product_id
      ) then
        raise exception 'variant_not_found';
      end if;

      update public.product_variants
      set
        color = nullif(trim(variant_row.color), ''),
        size = coalesce(nullif(trim(variant_row.size), ''), 'Free Size'),
        sku = trim(variant_row.sku),
        price = variant_row.price,
        stock_quantity = variant_row.stock_quantity,
        is_active = coalesce(variant_row.is_active, true)
      where id = variant_row.id
        and public.product_variants.product_id = v_product_id;
    end if;
  end loop;

  return jsonb_build_object(
    'product_id', v_product_id,
    'slug', product_slug
  );
end;
$$;

revoke execute on function public.admin_upsert_product(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.admin_upsert_product(uuid, jsonb, jsonb, jsonb) to authenticated, service_role;
