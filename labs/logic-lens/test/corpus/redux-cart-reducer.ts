export type CartAction =
  | { type: "add"; sku: string; qty: number; price: number }
  | { type: "remove"; sku: string }
  | { type: "setQty"; sku: string; qty: number }
  | { type: "applyCoupon"; code: string; percentOff: number }
  | { type: "clear" };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const existing = state.lines.find((l) => l.sku === action.sku);
      const lines = existing
        ? state.lines.map((l) => (l.sku === action.sku ? { ...l, qty: l.qty + action.qty } : l))
        : [...state.lines, { sku: action.sku, qty: action.qty, price: action.price }];
      return withTotals({ ...state, lines });
    }
    case "remove":
      return withTotals({ ...state, lines: state.lines.filter((l) => l.sku !== action.sku) });
    case "setQty": {
      if (action.qty <= 0) return cartReducer(state, { type: "remove", sku: action.sku });
      const lines = state.lines.map((l) => (l.sku === action.sku ? { ...l, qty: Math.min(action.qty, 99) } : l));
      return withTotals({ ...state, lines });
    }
    case "applyCoupon":
      if (state.coupon) return state; // only one coupon per cart
      return withTotals({ ...state, coupon: { code: action.code, percentOff: action.percentOff } });
    case "clear":
      return emptyCart();
    default:
      return state;
  }
}

function withTotals(state: CartState): CartState {
  const subtotal = state.lines.reduce((s, l) => s + l.qty * l.price, 0);
  const discount = state.coupon ? Math.round((subtotal * state.coupon.percentOff) / 100) : 0;
  return { ...state, subtotal, discount, total: subtotal - discount };
}
