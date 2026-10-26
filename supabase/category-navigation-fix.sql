-- Align legacy seeded homepage CTAs with the category slugs that exist in the
-- current catalog. Review custom banner content before running in production.

update public.banners
set
  cta_label = 'Shop Signature',
  cta_url = '/products?category=signature-collection',
  secondary_cta_label = 'Shop Evening Wear',
  secondary_cta_url = '/products?category=evening-wear',
  updated_at = now()
where placement = 'home_hero'
  and cta_url = '/products?category=men'
  and secondary_cta_url = '/products?category=women';
