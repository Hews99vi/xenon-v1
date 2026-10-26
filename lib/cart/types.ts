export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  image: string | null;
  color: string | null;
  size: string | null;
  price: number;
  quantity: number;
  stockQuantity: number;
};
