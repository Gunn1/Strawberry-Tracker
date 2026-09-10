/**
 * The messages a booking sends. Kept together so the wording is in one place
 * and the route handlers stay about the booking rather than the prose.
 *
 * Nothing here throws: an email failing must never fail the booking or the
 * cancellation that has already been written.
 */

import { formatCalendarDate, formatClock } from "@/lib/format/datetime";
import { sendMail } from "@/lib/mailer";

const FARM = "Carter's Red Wagon Farm";
const PHONE = "(218) 732-4979";

export interface BookingDetails {
  name: string;
  email: string;
  partySize: number;
  date: string;
  startMin: number;
  endMin: number;
  token: string;
}

/** Where staff notifications go: the owners named in the environment. */
export function staffRecipients(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function manageUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";
  return `${base.replace(/\/$/, "")}/booking/${token}`;
}

function when(b: Pick<BookingDetails, "date" | "startMin" | "endMin">): string {
  return `${formatCalendarDate(b.date)}, ${formatClock(b.startMin)} – ${formatClock(b.endMin)}`;
}

function pickers(n: number): string {
  return `${n} picker${n === 1 ? "" : "s"}`;
}

/** To the customer, when they book. */
export async function sendBookingConfirmation(b: BookingDetails): Promise<void> {
  await sendMail({
    to: b.email,
    subject: `Your picking time at ${FARM} — ${formatCalendarDate(b.date)}`,
    text: [
      `Hi ${b.name},`,
      ``,
      `You're booked in for u-pick strawberries:`,
      ``,
      `  ${when(b)}`,
      `  ${pickers(b.partySize)}`,
      ``,
      `Change or cancel: ${manageUrl(b.token)}`,
      ``,
      `We may close for weather, ripening, or once we're picked out, so check`,
      `today's status on the website before you set off.`,
      ``,
      `${FARM}, Park Rapids MN`,
      PHONE,
    ].join("\n"),
  });
}

/** To the farm, when a booking arrives. */
export async function notifyStaffOfBooking(b: BookingDetails): Promise<void> {
  await sendMail({
    to: staffRecipients(),
    subject: `New booking — ${formatCalendarDate(b.date)}, ${pickers(b.partySize)}`,
    text: [
      `${b.name} booked a picking time.`,
      ``,
      `  ${when(b)}`,
      `  ${pickers(b.partySize)}`,
      `  ${b.email}`,
      ``,
      `Everyone booked in: ${siteUrl()}/admin/bookings`,
    ].join("\n"),
  });
}

/** To the customer, when they move their own booking. */
export async function sendBookingChange(b: BookingDetails, wasWhen: string): Promise<void> {
  await sendMail({
    to: b.email,
    subject: `Your picking time has moved — ${formatCalendarDate(b.date)}`,
    text: [
      `Hi ${b.name},`,
      ``,
      `Your picking time has been changed. It was:`,
      ``,
      `  ${wasWhen}`,
      ``,
      `It is now:`,
      ``,
      `  ${when(b)}`,
      `  ${pickers(b.partySize)}`,
      ``,
      `Change or cancel: ${manageUrl(b.token)}`,
      ``,
      `${FARM}, Park Rapids MN`,
      PHONE,
    ].join("\n"),
  });
}

/** To the farm, when a customer moves theirs. */
export async function notifyStaffOfChange(b: BookingDetails, wasWhen: string): Promise<void> {
  await sendMail({
    to: staffRecipients(),
    subject: `Booking moved — ${formatCalendarDate(b.date)}, ${pickers(b.partySize)}`,
    text: [
      `${b.name} moved their picking time.`,
      ``,
      `  was ${wasWhen}`,
      `  now ${when(b)}`,
      `  ${pickers(b.partySize)}`,
      `  ${b.email}`,
      ``,
      `Everyone booked in: ${siteUrl()}/admin/bookings`,
    ].join("\n"),
  });
}

/** To the farm, when a customer cancels themselves. */
export async function notifyStaffOfCancellation(b: BookingDetails): Promise<void> {
  await sendMail({
    to: staffRecipients(),
    subject: `Booking cancelled — ${formatCalendarDate(b.date)}, ${pickers(b.partySize)}`,
    text: [
      `${b.name} cancelled their picking time, so those places are back on sale.`,
      ``,
      `  ${when(b)}`,
      `  ${pickers(b.partySize)}`,
      `  ${b.email}`,
      ``,
      `Everyone booked in: ${siteUrl()}/admin/bookings`,
    ].join("\n"),
  });
}

/**
 * To the customer, when the farm cancels on them. This one is not optional:
 * without it someone drives out to a morning that is no longer happening.
 */
export async function notifyCustomerOfCancellation(
  b: BookingDetails,
  reason: string,
): Promise<void> {
  await sendMail({
    to: b.email,
    subject: `Your picking time on ${formatCalendarDate(b.date)} has been cancelled`,
    text: [
      `Hi ${b.name},`,
      ``,
      `We're sorry — we've had to cancel your picking time:`,
      ``,
      `  ${when(b)}`,
      `  ${pickers(b.partySize)}`,
      ``,
      ...(reason ? [reason, ``] : []),
      `You're very welcome to book another morning: ${siteUrl()}/book`,
      ``,
      `If you'd rather talk it through, ring us on ${PHONE}.`,
      ``,
      `${FARM}, Park Rapids MN`,
    ].join("\n"),
  });
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
}
