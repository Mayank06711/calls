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
import { BookingChatModel } from "../models/bookingChatModel";
import { MsgModel } from "../models/messageModel";
import NotificationService from "../services/notifications";
import { SocketManager } from "../socket";
import { RedisManager } from "../utils/redisClient";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440; // handle >24h and negative
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

function calculateCreditRatePerMinute(pricing: { per15Min: number; per30Min: number; per60Min: number }): number {
  if (pricing.per60Min > 0) return Math.ceil(pricing.per60Min / 60);
  if (pricing.per30Min > 0) return Math.ceil(pricing.per30Min / 30);
  if (pricing.per15Min > 0) return Math.ceil(pricing.per15Min / 15);
  return 0;
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
    // Instant bookings: always refund if expert hasn't started yet
    const eligibleForRefund = booking.isInstant
      ? !booking.startedAt
      : hoursUntilSession > 2;

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

    // Create booking chat if it doesn't already exist (either sender/receiver direction)
    const existingChat = await MsgModel.findOne({
      $or: [
        { sender: booking.user, receiver: booking.expertUser, bookingId: booking._id },
        { sender: booking.expertUser, receiver: booking.user, bookingId: booking._id },
      ],
    });

    if (!existingChat) {
      try {
        await MsgModel.create({
          sender: booking.user,
          receiver: booking.expertUser,
          bookingId: booking._id,
          chatType: "booking",
          messages: [],
          messageIdCounter: 0,
        });
      } catch (err: any) {
        // Ignore duplicate key error (race condition — chat was created concurrently)
        if (err.code !== 11000) throw err;
      }
    }

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

  /**
   * POST /bookings/:id/extend — Extend an active session by 2, 5, or 10 minutes.
   * Only the booking user (client) can extend. Deducts credits atomically.
   */
  private static async _extendSession(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { extensionMinutes } = req.body;

    const booking = await BookingModel.findById(id);
    if (!booking) throw new ApiError(404, "Booking not found");

    // Only the user (client) can extend
    if (booking.user.toString() !== userId.toString()) {
      throw new ApiError(403, "Only the client can extend the session");
    }
    if (booking.status !== "confirmed") {
      throw new ApiError(400, "Booking is not active");
    }
    if (!booking.connectedAt) {
      throw new ApiError(400, "Session has not been connected yet");
    }

    // Check total extensions cap (max 30 min total)
    const totalExtended = (booking.extensions || []).reduce((sum, ext) => sum + ext.minutes, 0);
    if (totalExtended + extensionMinutes > 30) {
      throw new ApiError(400, `Maximum 30 minutes of extensions allowed. Already extended ${totalExtended} min.`);
    }

    // Validate timing: session must still be active
    const tz = booking.timezone || "Asia/Kolkata";
    const dateStr = moment(booking.date).tz(tz).format("YYYY-MM-DD");
    const sessionEnd = moment.tz(`${dateStr} ${booking.endTime}`, "YYYY-MM-DD HH:mm", tz);
    const now = moment();

    if (now.isAfter(sessionEnd)) {
      throw new ApiError(400, "Session has already ended");
    }

    // Only allow extension when ≤ 2.5 minutes remain
    const remainingMinutes = sessionEnd.diff(now, "minutes", true);
    if (remainingMinutes > 2.5) {
      throw new ApiError(400, "Extensions are only available when 2 minutes or less remain");
    }

    // Get expert pricing
    const expert = await ExpertModel.findById(booking.expert).select("pricing").lean();
    if (!expert?.pricing) throw new ApiError(500, "Expert pricing not found");

    const ratePerMin = calculateCreditRatePerMinute(expert.pricing);
    if (ratePerMin <= 0) throw new ApiError(500, "Expert credit rate not configured");

    const extensionCost = ratePerMin * extensionMinutes;

    // Check for overlap with expert's next booking
    const newEndMinutes = timeToMinutes(booking.endTime) + extensionMinutes;
    const newEndTime = minutesToTime(newEndMinutes);
    const dayStart = moment.tz(dateStr, "YYYY-MM-DD", tz).startOf("day").toDate();
    const dayEnd = moment.tz(dateStr, "YYYY-MM-DD", tz).endOf("day").toDate();

    const nextBookings = await BookingModel.find({
      expert: booking.expert,
      date: { $gte: dayStart, $lte: dayEnd },
      status: "confirmed",
      _id: { $ne: booking._id },
    }).select("startTime").sort({ startTime: 1 }).lean();

    // Find any booking that starts between current endTime and proposed newEndTime
    for (const nb of nextBookings) {
      const nbStart = timeToMinutes(nb.startTime);
      if (nbStart >= timeToMinutes(booking.endTime) && nbStart < newEndMinutes) {
        throw new ApiError(409, "Extension would overlap with the expert's next booking");
      }
    }

    // Atomic credit deduction
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, creditBalance: { $gte: extensionCost } },
      { $inc: { creditBalance: -extensionCost } },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(402, "Insufficient credits for this extension");
    }

    // Update booking
    const previousEndTime = booking.endTime;
    booking.endTime = newEndTime;
    booking.duration = booking.duration + extensionMinutes;
    booking.creditsCharged = booking.creditsCharged + extensionCost;
    if (!booking.extensions) booking.extensions = [];
    booking.extensions.push({
      minutes: extensionMinutes,
      creditsCharged: extensionCost,
      previousEndTime,
      newEndTime,
      extendedAt: new Date(),
    } as any);
    await booking.save();

    // Log credit transaction
    await CreditTransactionModel.create({
      user: userId,
      type: "booking_extension",
      amount: -extensionCost,
      balanceAfter: updatedUser.creditBalance,
      description: `Extended session by ${extensionMinutes} min (${previousEndTime} → ${newEndTime})`,
      reference: { model: "Booking", id: booking._id },
    });

    // Compute absolute totalExtendedMinutes from saved extensions array
    const totalExtendedMinutes = (booking.extensions || []).reduce(
      (sum: number, ext: any) => sum + ext.minutes, 0
    );

    // Notify both parties via socket
    try {
      const socketManager = SocketManager.getInstance();
      const extensionData = {
        bookingId: id,
        newEndTime,
        extensionMinutes,
        newDuration: booking.duration,
        creditsCharged: extensionCost,
        totalCreditsCharged: booking.creditsCharged,
        totalExtendedMinutes,
      };

      const expertSocket = await socketManager.getSocketIdUsingUserId(booking.expertUser.toString());
      if (expertSocket?.socketId) {
        await socketManager.emitEvent({
          event: "booking:session-extended",
          data: extensionData,
          targetSocketIds: [expertSocket.socketId],
        });
      }

      const userSocket = await socketManager.getSocketIdUsingUserId(userId.toString());
      if (userSocket?.socketId) {
        await socketManager.emitEvent({
          event: "booking:session-extended",
          data: extensionData,
          targetSocketIds: [userSocket.socketId],
        });
      }
    } catch (err) {
      console.error("Socket emit error for session extension (non-blocking):", err);
    }

    return res.status(200).json(
      successResponse({
        booking: {
          _id: booking._id,
          endTime: newEndTime,
          duration: booking.duration,
          creditsCharged: booking.creditsCharged,
          totalExtendedMinutes,
        },
        extensionCost,
        creditBalance: updatedUser.creditBalance,
      }, `Session extended by ${extensionMinutes} minutes`)
    );
  }

  /**
   * POST /bookings/instant — Create an instant booking.
   * Finds online experts in a category, picks median-priced, auto-creates booking.
   */
  private static readonly CATEGORY_TO_SPECIALIZATIONS: Record<string, string[]> = {
    clothing: ["Personal Styling", "Wardrobe Consulting", "Corporate & Workwear", "Streetwear & Trends"],
    hair: ["Personal Styling", "Color & Image Analysis"],
    makeup: ["Personal Styling", "Color & Image Analysis"],
    wedding: ["Bridal & Wedding", "Occasion & Event Styling", "Ethnic & Traditional"],
    makeover: ["Personal Styling", "Wardrobe Consulting", "Color & Image Analysis"],
  };

  private static async _createInstantBooking(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { category, duration } = req.body;
    const dur = typeof duration === "string" ? parseInt(duration) : duration;

    const specializations = BookingController.CATEGORY_TO_SPECIALIZATIONS[category];
    if (!specializations) throw new ApiError(400, "Invalid category");

    // Pricing key for the requested duration
    const pricingKey = `per${dur}Min` as "per15Min" | "per30Min" | "per60Min";

    // 1. Find verified experts with matching specializations
    const experts = await ExpertModel.find({
      specializations: { $in: specializations },
      "degree.isVerified": true,
    })
      .populate("user", "_id fullName username isExpert isActive isBlockedByAdmin")
      .lean();

    // 2. Filter: active, non-blocked, non-self, pricing configured
    const activeExperts = experts.filter((e: any) => {
      const u = e.user;
      return (
        u &&
        u.isActive !== false &&
        u.isExpert &&
        !u.isBlockedByAdmin &&
        u._id.toString() !== userId.toString() &&
        e.pricing?.[pricingKey] > 0
      );
    });

    // 3. Check online via Redis
    const onlineExperts: any[] = [];
    for (const expert of activeExperts) {
      const expertUserId = (expert.user as any)._id.toString();
      const sessionIds = await RedisManager.getActiveSessionIds(expertUserId);
      if (sessionIds.length > 0) {
        onlineExperts.push(expert);
      }
    }

    if (onlineExperts.length === 0) {
      return res.status(200).json(
        successResponse(
          { booking: null },
          "No experts are currently available in this category. Try scheduling an appointment."
        )
      );
    }

    // 4. Sort by price, pick median
    onlineExperts.sort((a: any, b: any) => (a.pricing[pricingKey] || 0) - (b.pricing[pricingKey] || 0));
    const selected = onlineExperts[Math.floor(onlineExperts.length / 2)];
    const expertUser = selected.user as any;
    const cost = selected.pricing[pricingKey];

    // 5. Atomic credit deduction
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, creditBalance: { $gte: cost } },
      { $inc: { creditBalance: -cost } },
      { new: true }
    );
    if (!updatedUser) {
      throw new ApiError(402, "Insufficient credits. Please top up your balance.");
    }

    // 6. Compute times
    const availability = await ExpertAvailabilityModel.findOne({ expert: selected._id }).lean();
    const tz = availability?.timezone || "Asia/Kolkata";
    const now = moment().tz(tz);
    const startTime = now.format("HH:mm");
    const endTime = computeEndTime(startTime, dur);
    const dateObj = moment().tz(tz).startOf("day").toDate();

    // 7. Create booking
    const booking = await BookingModel.create({
      user: userId,
      expert: selected._id,
      expertUser: expertUser._id,
      date: dateObj,
      startTime,
      endTime,
      duration: dur,
      timezone: tz,
      status: "confirmed",
      creditsCharged: cost,
      isInstant: true,
      connectedAt: new Date(), // auto-connect
    });

    // 8. Create session permission
    await SessionPermissionModel.create({
      booking: booking._id,
      user: userId,
      expert: expertUser._id,
      permissions: { closet: false, outfits: false },
      isActive: true,
      grantedAt: new Date(),
    });

    // 9. Create booking chat
    try {
      await MsgModel.create({
        sender: userId,
        receiver: expertUser._id,
        bookingId: booking._id,
        chatType: "booking",
        messages: [],
        messageIdCounter: 0,
      });
    } catch (err: any) {
      if (err.code !== 11000) throw err; // ignore duplicate
    }

    // 10. Log credit transaction
    const bookerUser = await UserModel.findById(userId).select("fullName").lean();
    await CreditTransactionModel.create({
      user: userId,
      type: "booking_deduction",
      amount: -cost,
      balanceAfter: updatedUser.creditBalance,
      description: `Instant ${dur}-min session with ${expertUser.fullName}`,
      reference: { model: "Booking", id: booking._id },
    });

    // 11. Notify expert via socket
    const socketManager = SocketManager.getInstance();
    const expertSocket = await socketManager.getSocketIdUsingUserId(expertUser._id.toString());
    if (expertSocket?.socketId) {
      await socketManager.emitEvent({
        event: "booking:instant-request",
        data: {
          bookingId: (booking._id as any).toString(),
          userName: bookerUser?.fullName || "A user",
          duration: dur,
          category,
        },
        targetSocketIds: [expertSocket.socketId],
      });
    }

    // Also send push notification
    const notificationService = NotificationService.getInstance();
    await notificationService.emitUserNotification({
      recipientId: expertUser._id.toString(),
      type: "booking" as any,
      title: "Instant Session Request",
      message: `${bookerUser?.fullName || "A user"} wants a ${dur}-min instant session`,
    });

    return res.status(201).json(
      successResponse({
        booking: {
          _id: booking._id,
          expertName: expertUser.fullName,
          expertUserId: expertUser._id,
          date: moment(dateObj).format("YYYY-MM-DD"),
          startTime,
          endTime,
          duration: dur,
          creditsCharged: cost,
          status: "confirmed",
          isInstant: true,
        },
        creditBalance: updatedUser.creditBalance,
      }, "Instant session created. Waiting for expert to start.")
    );
  }

  // ── Wrapped public methods ──
  static getAvailableSlots = AsyncHandler.wrap(BookingController._getAvailableSlots);
  static createBooking = AsyncHandler.wrap(BookingController._createBooking);
  static createInstantBooking = AsyncHandler.wrap(BookingController._createInstantBooking);
  static getMyBookings = AsyncHandler.wrap(BookingController._getMyBookings);
  static getExpertBookings = AsyncHandler.wrap(BookingController._getExpertBookings);
  static cancelBooking = AsyncHandler.wrap(BookingController._cancelBooking);
  static connectBooking = AsyncHandler.wrap(BookingController._connectBooking);
  static extendSession = AsyncHandler.wrap(BookingController._extendSession);
}

export default BookingController;
