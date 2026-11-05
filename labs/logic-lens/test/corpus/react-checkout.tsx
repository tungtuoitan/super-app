import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../ui/toast";

export function CheckoutForm({ cartId }: { cartId: string }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [coupon, setCoupon] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const toast = useToast();

  // Load the cart when the component mounts or the cart changes
  useEffect(() => {
    let cancelled = false;
    api.get(`/carts/${cartId}`)
      .then((c) => { if (!cancelled) setCart(c); })
      .catch(() => toast.error("Không tải được giỏ hàng"));
    return () => { cancelled = true; };
  }, [cartId]);

  async function applyCoupon() {
    if (!coupon.trim()) return;
    const res = await api.post(`/carts/${cartId}/coupon`, { code: coupon });
    if (res.ok) setCart(res.cart);
    else toast.warn("Mã không hợp lệ");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart || cart.items.length === 0) {
      toast.warn("Giỏ hàng trống");
      return;
    }
    setStatus("saving");
    try {
      const order = await api.post("/orders", { cartId, coupon });
      toast.success(`Đã đặt đơn #${order.id}`);
      window.location.assign(`/orders/${order.id}`);
    } catch (err) {
      setStatus("error");
      toast.error(err instanceof PaymentError ? "Thẻ bị từ chối" : "Có lỗi, thử lại");
    }
  }

  if (!cart) return <Spinner />;
  return (
    <form onSubmit={submit}>
      <CartLines items={cart.items} />
      <input value={coupon} onChange={(e) => setCoupon(e.target.value)} />
      <button type="button" onClick={applyCoupon}>Áp mã</button>
      <button disabled={status === "saving"}>Đặt hàng</button>
    </form>
  );
}
