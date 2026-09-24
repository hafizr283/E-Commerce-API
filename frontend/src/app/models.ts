export interface User {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}
export interface Product {
  id: number;
  version: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  active: boolean;
}
export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalElements: number;
}
export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  lineTotal: number;
}
export interface Cart {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}
export interface OrderItem {
  productId: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
}
export interface Order {
  id: number;
  userId: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  recipient: string;
  phone: string;
  address: string;
  city: string;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
}
export interface Address {
  recipient: string;
  phone: string;
  address: string;
  city: string;
}
export function message(error: any): string {
  // A dropped connection carries no HTTP status, and its `error` is the
  // browser's own TypeError ("Failed to fetch") rather than this API's JSON
  // body, so it must be recognised before any message is read off it.
  if (error?.status === 0)
    return "The store is temporarily unavailable. Please try again.";
  const body = error?.error;
  return typeof body?.message === "string" && !(body instanceof Error)
    ? body.message
    : "Something went wrong. Please try again.";
}
export function fields(error: any): string {
  return Object.entries(error?.error?.fields || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}
