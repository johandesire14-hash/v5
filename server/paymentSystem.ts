import crypto from "crypto";

export type InvoiceStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentProvider = "wave" | "kpay";

export interface Invoice {
  paymentId: string;
  invoiceNumber: string;
  createdAt: string;
  status: InvoiceStatus;
  customerUid: string;
  customerEmail: string;
  offerId: string;
  offerName: string;
  offerType: string;
  companyId: string;
  creatorId: string;
  grossAmount: number;
  currency: string;
  providerFee: number;
  platformFee: number;
  creatorNetAmount: number;
  paymentProvider: PaymentProvider;
  phoneNumber?: string;
  providerTransactionId?: string;
  confirmedAt?: string;
  expiresAt?: string;
  refundId?: string | null;
}

export interface Refund {
  refundId: string;
  paymentId: string;
  amount: number;
  reason: string;
  approvedBy: string;
  createdAt: string;
  status: "pending" | "completed";
}

const invoices = new Map<string, Invoice>();
const refunds = new Map<string, Refund>();
let invoiceSequence = 0;

function nextPaymentId() {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function nextInvoiceNumber() {
  invoiceSequence += 1;
  return `INV-${new Date().getFullYear()}-${String(invoiceSequence).padStart(5, "0")}`;
}

export function createInvoice(input: Omit<Invoice, "paymentId" | "invoiceNumber" | "createdAt" | "status" | "providerFee" | "platformFee" | "creatorNetAmount" | "refundId">) {
  if (!input.customerUid) throw new Error("AUTHENTICATED_USER_REQUIRED");
  if (!input.offerId || !input.companyId || !input.creatorId) throw new Error("OFFER_OWNERSHIP_REQUIRED");
  if (!Number.isFinite(input.grossAmount) || input.grossAmount <= 0) throw new Error("INVALID_AMOUNT");

  const invoice: Invoice = {
    ...input,
    paymentId: nextPaymentId(),
    invoiceNumber: nextInvoiceNumber(),
    createdAt: new Date().toISOString(),
    status: "pending",
    providerFee: 0,
    platformFee: 0,
    creatorNetAmount: 0,
    refundId: null,
  };
  invoices.set(invoice.paymentId, invoice);
  return invoice;
}

export function getInvoice(paymentId: string) {
  return invoices.get(paymentId);
}

export function listInvoices() {
  return Array.from(invoices.values());
}

export function confirmInvoice(paymentId: string, providerTransactionId: string, amount: number, providerFee = 0) {
  const invoice = invoices.get(paymentId);
  if (!invoice) throw new Error("INVOICE_NOT_FOUND");
  if (invoice.status === "paid" || invoice.status === "refunded") return invoice;
  if (invoice.status !== "pending") throw new Error("INVOICE_NOT_PAYABLE");
  if (Math.round(amount) !== Math.round(invoice.grossAmount)) throw new Error("AMOUNT_MISMATCH");

  const platformFee = Math.round(invoice.grossAmount * 0.03);
  invoice.providerFee = Math.max(0, Math.round(providerFee));
  invoice.platformFee = platformFee;
  invoice.creatorNetAmount = Math.max(0, invoice.grossAmount - invoice.providerFee - platformFee);
  invoice.providerTransactionId = providerTransactionId;
  invoice.confirmedAt = new Date().toISOString();
  invoice.status = "paid";
  invoices.set(paymentId, invoice);
  return invoice;
}

export function failInvoice(paymentId: string) {
  const invoice = invoices.get(paymentId);
  if (!invoice || invoice.status !== "pending") return invoice;
  invoice.status = "failed";
  invoices.set(paymentId, invoice);
  return invoice;
}

export function createRefund(paymentId: string, amount: number, reason: string, approvedBy: string) {
  const invoice = invoices.get(paymentId);
  if (!invoice) throw new Error("INVOICE_NOT_FOUND");
  if (invoice.status !== "paid") throw new Error("INVOICE_NOT_REFUNDABLE");
  if (amount <= 0 || amount > invoice.grossAmount) throw new Error("INVALID_REFUND_AMOUNT");

  const refund: Refund = {
    refundId: `REF-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    paymentId,
    amount,
    reason,
    approvedBy,
    createdAt: new Date().toISOString(),
    status: "completed",
  };
  refunds.set(refund.refundId, refund);
  invoice.status = "refunded";
  invoice.refundId = refund.refundId;
  invoices.set(paymentId, invoice);
  return refund;
}

export function reconcilePendingInvoices(maxAgeMinutes = 24 * 60) {
  const threshold = Date.now() - maxAgeMinutes * 60 * 1000;
  let failed = 0;
  for (const invoice of invoices.values()) {
    if (invoice.status === "pending" && new Date(invoice.createdAt).getTime() < threshold) {
      failInvoice(invoice.paymentId);
      failed += 1;
    }
  }
  return { checked: invoices.size, failed };
}

export function verifyProviderSignature(rawBody: string, signature: string | undefined, secret: string | undefined) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function getRefund(refundId: string) {
  return refunds.get(refundId);
}
