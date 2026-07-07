import type { Business } from "@/portal-config";
import { type EmailMessage, sendEmail } from "@/server/lib/email";
import type { Money } from "@/portal-config";
import type { Order } from "./order";

interface EmailContent {
  subject: string;
  text: string;
}

const formatAmount = (money: Money): string => `${money.currencyCode} ${(money.amount / 100).toFixed(2)}`;

const lineText = (order: Order): string =>
  order.lines
    .map((line) => {
      const suffix = line.available ? "" : " (no longer available)";
      return `- ${line.name} x${line.quantity} @ ${formatAmount(line.unitPrice)} = ${formatAmount(line.lineTotal)}${suffix}`;
    })
    .join("\n");

const totalsText = (order: Order): string => {
  const rows = [`Subtotal: ${formatAmount(order.subtotal)}`];
  if (order.tax) rows.push(`Tax: ${formatAmount(order.tax)}`);
  rows.push(`Total: ${formatAmount(order.total)}`);
  return rows.join("\n");
};

export const buyerConfirmationEmail = (order: Order, business: Business): EmailContent => ({
  subject: `Your order with ${business.name} (${order.id})`,
  text: [
    `Thanks ${order.buyer.name}, we received your order.`,
    ``,
    `Order ${order.id}`,
    lineText(order),
    ``,
    totalsText(order),
    ``,
    `Payment instructions:`,
    order.paymentInstructions,
  ].join("\n"),
});

export const supplierNotificationEmail = (order: Order, business: Business): EmailContent => ({
  subject: `New order ${order.id} from ${order.buyer.name}`,
  text: [
    `${business.name} received a new order via the Portal.`,
    ``,
    `Order ${order.id}`,
    `Buyer: ${order.buyer.name} (${order.buyer.contact})`,
    lineText(order),
    ``,
    totalsText(order),
  ].join("\n"),
});

const looksLikeEmail = (value: string): boolean => /.+@.+\..+/.test(value);

const safeSend = async (message: EmailMessage): Promise<void> => {
  try {
    await sendEmail(message);
  } catch (error) {
    console.error(`[email] failed to=${message.to}`, error);
  }
};

export const sendOrderEmails = async (order: Order, business: Business): Promise<void> => {
  const tasks: Promise<void>[] = [];
  if (looksLikeEmail(order.buyer.contact)) {
    tasks.push(safeSend({ to: order.buyer.contact, ...buyerConfirmationEmail(order, business) }));
  }
  const supplierEmail = business.contact.email;
  if (supplierEmail) {
    tasks.push(safeSend({ to: supplierEmail, ...supplierNotificationEmail(order, business) }));
  }
  await Promise.all(tasks);
};
