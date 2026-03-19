import { Request, Response } from "express";
import { Types } from "mongoose";
import moment from "moment-timezone";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { UserModel } from "../models/userModel";
import { ExpertModel } from "../models/expertModel";
import { BookingModel } from "../models/bookingModel";
import { ExpertAvailabilityModel } from "../models/expertAvailabilityModel";
import { CreditTransactionModel } from "../models/creditTransactionModel";
import { SessionPermissionModel } from "../models/sessionPermissionModel";
import NotificationService from "../services/notifications";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Check if time range [startA, endA] conflicts with [startB, endB] + buffer.
 * Buffer creates a blocked zone around range B: [startB - buffer, endB + buffer].
 */
function hasTimeConflict(
  startA: number, endA: number,
  startB: number, endB: number,
  buffer: number
): boolean {
  return startA < endB + buffer && endA > startB - buffer;
}

/**
 * Generate available time slots for a given date based on expert's weekly schedule.
 * - Supports multiple availability windows per day (e.g. morning + afternoon)
 * - Buffer is only enforced around actual bookings, not between empty slots
 * - Uses range overlap to detect conflicts (not just startTime match)
 */
function generateAvailableSlots(
  availability: any,
  existingBookings: any[],
  dateStr: string,
  duration: number
): Array<{ startTime: string; endTime: string; available: boolean }> {
  const tz = availability.timezone || "Asia/Kolkata";
  const dateMoment = moment.tz(dateStr, "YYYY-MM-DD", tz);
  const dayOfWeek = dateMoment.day();

  // Find ALL matching windows for this day (supports morning + afternoon etc.)
  const daySlots = (availability.weeklySlots || []).filter(
    (s: any) => s.day === dayOfWeek && s.isActive
  );
  if (daySlots.length === 0) return [];

  const buffer = availability.bufferMinutes || 0;
  const now = moment.tz(tz);
  const isToday = dateMoment.isSame(now, "day");

  // Convert existing bookings to minute ranges for overlap checking
  const bookedRanges = existingBookings.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  const slots: Array<{ startTime: string; endTime: string; available: boolean }> = [];

  for (const daySlot of daySlots) {
    const windowStart = timeToMinutes(daySlot.startTime);
    const windowEnd = timeToMinutes(daySlot.endTime);

    let cursor = windowStart;
    while (cursor + duration <= windowEnd) {
      const slotStart = minutesToTime(cursor);
      const slotEnd = minutesToTime(cursor + duration);

      let available = true;

      // Check range overlap with existing bookings (buffer around bookings only)
      for (const booked of bookedRanges) {
        if (hasTimeConflict(cursor, cursor + duration, booked.start, booked.end, buffer)) {
          available = false;
          break;
        }
      }

      // Filter out past slots if today
      if (isToday && available) {
        const slotMoment = moment.tz(`${dateStr} ${slotStart}`, "YYYY-MM-DD HH:mm", tz);
        if (slotMoment.isBefore(now)) {
          available = false;
        }
      }

      slots.push({ startTime: slotStart, endTime: slotEnd, available });
      cursor += duration; // increment by duration only, NOT duration + buffer
    }
  }

  return slots;
}

/**
 * Compute end time from start time + duration.
 */
function computeEndTime(startTime: string, duration: number): string {
  const totalMin = timeToMinutes(startTime) + duration;
  return minutesToTime(totalMin);
}

// ─── Controller ─────────────────────────────────────────────────────────────

class BookingController {
  /**
   * GET /bookings/slots/:expertId?date=YYYY-MM-DD&duration=30
   * Returns available time slots for a given date.
   */
  private static async _getAvailableSlots(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { expertId } = req.params;
    const dateStr = req.query.date as string;
    const duration = parseInt(req.query.duration as string) || 30;

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new ApiError(400, "Date must be YYYY-MM-DD");
    }
    if (![15, 30, 60].includes(duration)) {
      throw new ApiError(400, "Duration must be 15, 30, or 60");
    }

    // Check availability is configured
    const availability = await ExpertAvailabilityModel.findOne({ expert: expertId }).lean();
    if (!availability) {
      return res.status(200).json(
        successResponse({ slots: [], message: "Expert has not set availability yet" })
      );
    }

    // Check supported duration
    if (!availability.slotDurations.includes(duration)) {
      throw new ApiError(400, `Expert does not offer ${duration}-minute sessions`);
    }

    // Get existing confirmed bookings for this expert on this date
    const tz = availability.timezone || "Asia/Kolkata";
    const dayStart = moment.tz(dateStr, "YYYY-MM-DD", tz).startOf("day").toDate();
    const dayEnd = moment.tz(dateStr, "YYYY-MM-DD", tz).endOf("day").toDate();

    const existingBookings = await BookingModel.find({
      expert: expertId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: "confirmed",
    })
      .select("startTime endTime duration")
      .lean();

    const slots = generateAvailableSlots(availability, existingBookings, dateStr, duration);

    return res.status(200).json(
      successResponse({ slots, timezone: tz, date: dateStr, duration })
    );
  }

  /**
   * POST /bookings — Create a new booking.
   * Atomic credit deduction with $inc + $gte guard.
   */
  private static async _createBooking(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { expertId, date, startTime, duration, notes } = req.body;
    const dur = typeof duration === "string" ? parseInt(duration) : duration;

    // Find expert and their user
    const expert = await ExpertModel.findById(expertId).populate("user", "_id fullName").lean();
    if (!expert) throw new ApiError(404, "Expert not found");
    const expertUser = expert.user as any;

    // Prevent self-booking
    if (expertUser._id.toString() === userId.toString()) {
      throw new ApiError(400, "You cannot book yourself");
    }

    // Determine credit cost
    const pricing = expert.pricing || { per15Min: 0, per30Min: 0, per60Min: 0 };
    let cost = 0;
    if (dur === 15) cost = pricing.per15Min;
    else if (dur === 30) cost = pricing.per30Min;
    else if (dur === 60) cost = pricing.per60Min;

    if (cost <= 0) throw new ApiError(400, "Expert pricing not configured for this duration");

    // Check availability
    const availability = await ExpertAvailabilityModel.findOne({ expert: expertId }).lean();
    if (!availability) throw new ApiError(400, "Expert has not set availability");

    if (!availability.slotDurations.includes(dur)) {
      throw new ApiError(400, `Expert does not offer ${dur}-minute sessions`);
    }

    const tz = availability.timezone || "Asia/Kolkata";
    const endTime = computeEndTime(startTime, dur);
    const buffer = availability.bufferMinutes || 0;

    // Validate slot fits within expert's availability window
    const dateMoment = moment.tz(date, "YYYY-MM-DD", tz);
    const dayOfWeek = dateMoment.day();
    const activeDaySlots = (availability.weeklySlots || []).filter(
      (s: any) => s.day === dayOfWeek && s.isActive
    );

    const newStartMin = timeToMinutes(startTime);
    const newEndMin = newStartMin + dur;

    const fitsWindow = activeDaySlots.some((slot: any) => {
      const windowStart = timeToMinutes(slot.startTime);
      const windowEnd = timeToMinutes(slot.endTime);
      return newStartMin >= windowStart && newEndMin <= windowEnd;
    });

    if (!fitsWindow) {
      throw new ApiError(400, "Selected time is outside expert's availability");
    }

    // Check no conflicting booking (range overlap + buffer)
    const dayStart = moment.tz(date, "YYYY-MM-DD", tz).startOf("day").toDate();
    const dayEnd = moment.tz(date, "YYYY-MM-DD", tz).endOf("day").toDate();

    const existingBookings = await BookingModel.find({
      expert: expertId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: "confirmed",
    }).select("startTime endTime").lean();

    const conflict = existingBookings.find((b) =>
      hasTimeConflict(newStartMin, newEndMin, timeToMinutes(b.startTime), timeToMinutes(b.endTime), buffer)
    );

    if (conflict) {
      throw new ApiError(409, "This time slot conflicts with an existing booking");
    }

    // Atomic credit deduction — only succeeds if user has enough
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, creditBalance: { $gte: cost } },
      { $inc: { creditBalance: -cost } },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(402, "Insufficient credits. Please top up your balance.");
    }

    // Create booking
    const booking = await BookingModel.create({
      user: userId,
      expert: expertId,
      expertUser: expertUser._id,
      date: moment.tz(date, "YYYY-MM-DD", tz).startOf("day").toDate(),
      startTime,
      endTime,
      duration: dur,
      timezone: tz,
      status: "confirmed",
      creditsCharged: cost,
      notes: notes || undefined,
    });

    // Create session permission (all permissions off by default)
    await SessionPermissionModel.create({
      booking: booking._id,
      user: userId,
      expert: expertUser._id,
      permissions: { closet: false, outfits: false },
      isActive: true,
      grantedAt: new Date(),
    });

    // Log credit transaction
    await CreditTransactionModel.create({
      user: userId,
      type: "booking_deduction",
      amount: -cost,
      balanceAfter: updatedUser.creditBalance,
      description: `Booked ${dur}-min session with ${expertUser.fullName} on ${date} at ${startTime}`,
      reference: { model: "Booking", id: booking._id },
    });

    // Notify expert
    const notificationService = NotificationService.getInstance();
    const bookerUser = await UserModel.findById(userId).select("fullName").lean();
    await notificationService.emitUserNotification({
      recipientId: expertUser._id.toString(),
      type: "booking" as any,
      title: "New Booking",
      message: `${bookerUser?.fullName || "A user"} booked a ${dur}-min session on ${date} at ${startTime}`,
    });

    return res.status(201).json(
      successResponse({
        booking: {
          _id: booking._id,
          expertName: expertUser.fullName,
          date,
          startTime,
          endTime,
          duration: dur,
          creditsCharged: cost,
          status: "confirmed",
        },
        creditBalance: updatedUser.creditBalance,
      }, "Booking confirmed")
    );
  }

  /**
   * GET /bookings/my — Get user's bookings (upcoming + past).
   */
  private static async _getMyBookings(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const bookings = await BookingModel.find({ user: userId })
      .sort({ date: -1, startTime: -1 })
      .populate("expert", "specializations experienceInYears pricing")
      .populate("expertUser", "fullName username profilePhotoId mediaId")
      .lean();

    const now = moment();
    const upcoming: any[] = [];
    const past: any[] = [];

    for (const b of bookings) {
      // Build actual session end datetime using date + endTime + timezone
      const tz = b.timezone || "Asia/Kolkata";
      const dateStr = moment(b.date).tz(tz).format("YYYY-MM-DD");
      const sessionEnd = moment.tz(`${dateStr} ${b.endTime}`, "YYYY-MM-DD HH:mm", tz);
      if (b.status === "confirmed" && sessionEnd.isAfter(now)) {
        upcoming.push(b);
      } else {
        past.push(b);
      }
    }

    return res.status(200).json(
      successResponse({ upcoming, past })
    );
  }

  /**
   * GET /bookings/expert — Get expert's bookings.
   */
  private static async _getExpertBookings(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!req.user?.isExpert) throw new ApiError(403, "Not an expert");

    const bookings = await BookingModel.find({ expertUser: userId })
      .sort({ date: -1, startTime: -1 })
      .populate("user", "fullName username profilePhotoId mediaId")
      .lean();

    const now = moment();
    const upcoming: any[] = [];
    const past: any[] = [];

    for (const b of bookings) {
      const tz = b.timezone || "Asia/Kolkata";
      const dateStr = moment(b.date).tz(tz).format("YYYY-MM-DD");
      const sessionEnd = moment.tz(`${dateStr} ${b.endTime}`, "YYYY-MM-DD HH:mm", tz);
      if (b.status === "confirmed" && sessionEnd.isAfter(now)) {
        upcoming.push(b);
      } else {
        past.push(b);
      }
    }

    return res.status(200).json(
      successResponse({ upcoming, past })
    );
  }

  /**
   * POST /bookings/:id/cancel — Cancel a booking.
   * Refund credits if > 2 hours before start.
   */
  private static async _cancelBooking(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { reason } = req.body || {};

    const booking = await BookingModel.findById(id);
    if (!booking) throw new ApiError(404, "Booking not found");

    // Only the user or the expert can cancel
    const isBooker = booking.user.toString() === userId.toString();
    const isExpert = booking.expertUser.toString() === userId.toString();
    if (!isBooker && !isExpert) {
      throw new ApiError(403, "You don't have permission to cancel this booking");
    }

    if (booking.status !== "confirmed") {
      throw new ApiError(400, "Only confirmed bookings can be cancelled");
    }

    // Check if > 2h before session for refund eligibility
    const tz = booking.timezone || "Asia/Kolkata";
    const sessionStart = moment.tz(
      moment(booking.date).format("YYYY-MM-DD") + " " + booking.startTime,
      "YYYY-MM-DD HH:mm",
      tz
    );
    const hoursUntilSession = sessionStart.diff(moment(), "hours", true);
    const eligibleForRefund = hoursUntilSession > 2;

    // Update booking
    booking.status = "cancelled";
    booking.cancelledBy = isBooker ? "user" : "expert";
    booking.cancellationReason = reason || undefined;
    booking.cancelledAt = new Date();
    await booking.save();

    let refundedCredits = 0;

    if (eligibleForRefund) {
      refundedCredits = booking.creditsCharged;
      const updatedUser = await UserModel.findOneAndUpdate(
        { _id: booking.user },
        { $inc: { creditBalance: refundedCredits } },
        { new: true }
      );

      if (updatedUser) {
        await CreditTransactionModel.create({
          user: booking.user,
          type: "booking_refund",
          amount: refundedCredits,
          balanceAfter: updatedUser.creditBalance,
          description: `Refund for cancelled booking on ${moment(booking.date).format("YYYY-MM-DD")} at ${booking.startTime}`,
          reference: { model: "Booking", id: booking._id },
        });
      }
    }

    // Notify the other party
    const notificationService = NotificationService.getInstance();
    const recipientId = isBooker
      ? booking.expertUser.toString()
      : booking.user.toString();
    const canceller = await UserModel.findById(userId).select("fullName").lean();

    await notificationService.emitUserNotification({
      recipientId,
      type: "booking" as any,
      title: "Booking Cancelled",
      message: `${canceller?.fullName || "Someone"} cancelled the session on ${moment(booking.date).format("MMM D")} at ${booking.startTime}${eligibleForRefund ? ". Credits have been refunded." : "."}`,
    });

    return res.status(200).json(
      successResponse({
        booking: { _id: booking._id, status: "cancelled" },
        refundedCredits,
        eligibleForRefund,
      }, eligibleForRefund ? "Booking cancelled. Credits refunded." : "Booking cancelled. No refund (less than 2 hours before session).")
    );
  }

  /**
   * POST /bookings/:id/connect — Validate timing and return expertUserId for chat.
   * Connect is allowed 5 minutes before session start through session end.
   */
  private static async _connectBooking(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const booking = await BookingModel.findById(id).lean();
    if (!booking) throw new ApiError(404, "Booking not found");

    const isBooker = booking.user.toString() === userId.toString();
    const isExpert = booking.expertUser.toString() === userId.toString();
    if (!isBooker && !isExpert) {
      throw new ApiError(403, "Not your booking");
    }
    if (booking.status !== "confirmed") {
      throw new ApiError(400, "Booking is not active");
    }

    // Validate timing: allow 2 min before start through end
    const tz = booking.timezone || "Asia/Kolkata";
    const sessionStart = moment.tz(
      moment(booking.date).format("YYYY-MM-DD") + " " + booking.startTime,
      "YYYY-MM-DD HH:mm",
      tz
    );
    const sessionEnd = moment(sessionStart).add(booking.duration, "minutes");
    const connectWindow = moment(sessionStart).subtract(2, "minutes");
    const now = moment();

    if (now.isBefore(connectWindow)) {
      const minsUntil = connectWindow.diff(now, "minutes");
      throw new ApiError(400, `Connect opens ${minsUntil} minutes before the session`);
    }

    if (now.isAfter(sessionEnd)) {
      throw new ApiError(400, "Session time has passed");
    }

    // Mark connected
    await BookingModel.updateOne(
      { _id: booking._id },
      { connectedAt: new Date() }
    );

    // Return the other party's userId so both sides can initiate chat
    const otherUserId = isBooker
      ? booking.expertUser.toString()
      : booking.user.toString();

    return res.status(200).json(
      successResponse({
        expertUserId: booking.expertUser.toString(),
        otherUserId,
        bookingId: booking._id,
        role: isBooker ? "user" : "expert",
      }, "Connect now")
    );
  }

  // ── Wrapped public methods ──
  static getAvailableSlots = AsyncHandler.wrap(BookingController._getAvailableSlots);
  static createBooking = AsyncHandler.wrap(BookingController._createBooking);
  static getMyBookings = AsyncHandler.wrap(BookingController._getMyBookings);
  static getExpertBookings = AsyncHandler.wrap(BookingController._getExpertBookings);
  static cancelBooking = AsyncHandler.wrap(BookingController._cancelBooking);
  static connectBooking = AsyncHandler.wrap(BookingController._connectBooking);
}

export default BookingController;
