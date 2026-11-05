type Status = "draft" | "placed" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";

const TRANSITIONS: Record<Status, Status[]> = {
  draft: ["placed", "cancelled"],
  placed: ["paid", "cancelled"],
  paid: ["shipped", "refunded"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export async function transition(orderId: string, to: Status, actor: Actor) {
  const order = await db.orders.findOrThrow(orderId);
  if (!TRANSITIONS[order.status].includes(to)) {
    throw new InvalidTransition(order.status, to);
  }
  if (to === "refunded" && !actor.roles.includes("finance")) {
    throw new Forbidden("only finance can refund");
  }

  await db.tx(async (t) => {
    await t.orders.update(orderId, { status: to, updatedBy: actor.id });
    await t.orderEvents.insert({ orderId, from: order.status, to, at: new Date() });
  });

  switch (to) {
    case "paid":
      await queue.publish("fulfilment.start", { orderId });
      break;
    case "shipped":
      await notify.customer(order.customerId, "shipped", { tracking: order.trackingNo });
      break;
    case "refunded":
      await payments.refund(order.paymentId);
      await notify.customer(order.customerId, "refunded");
      break;
  }
  return to;
}
