// POST /webhooks/payments — called by the payment provider when a charge succeeds or fails
router.post("/webhooks/payments", async (req, res) => {
  const signature = req.headers["x-signature"];
  if (!verifySignature(req.rawBody, signature)) {
    return res.status(400).send("bad signature");
  }

  const event = req.body;
  const order = await orders.findByPaymentId(event.paymentId);
  if (!order) return res.status(404).send("unknown payment");

  if (event.type === "charge.succeeded") {
    await orders.update(order.id, { status: "paid" });
    await inventory.reserve(order.items);
    await mailer.send(order.customerEmail, "receipt", { orderId: order.id });
  } else if (event.type === "charge.failed") {
    await orders.update(order.id, { status: "payment_failed" });
  }

  res.status(200).send("ok");
});
