-- One Razorpay capture id must not fulfill multiple subscription payments.
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");
