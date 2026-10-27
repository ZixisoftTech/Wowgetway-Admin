import mongoose from 'mongoose';
import { Coupon, Property, HomestayOwner } from './models.js';

/**
 * Check if a coupon is applicable to a specific property document
 */
export const isCouponApplicableToProperty = async (coupon, property) => {
  if (!coupon || !property) return false;
  const applicable = coupon.applicableHomestays;
  if (!Array.isArray(applicable) || applicable.length === 0) {
    return false;
  }

  const propIdStr = String(property._id || '');
  const propCodeStr = String(property.propertyId || '').trim().toLowerCase();
  const propNameStr = String(property.name || '').trim().toLowerCase();

  // 1. Check if explicitly listed in applicableHomestays
  const isExplicit = applicable.some(h => {
    if (!h) return false;
    const val = String(h).trim();
    if (val === 'all') return false;
    if (propIdStr && val === propIdStr) return true;
    if (propCodeStr && val.toLowerCase() === propCodeStr) return true;
    if (propNameStr && val.toLowerCase() === propNameStr) return true;
    return false;
  });

  if (isExplicit) return true;

  // 2. If 'all', coupon applies to all homestays of that owner (or system-wide if created by admin)
  if (applicable.includes('all')) {
    if (coupon.ownerId && property.ownerId && String(coupon.ownerId) !== String(property.ownerId)) {
      const isOwner = await HomestayOwner.exists({ _id: coupon.ownerId });
      if (isOwner) {
        return false;
      }
    }
    return true;
  }

  return false;
};

/**
 * Authoritative Coupon Validation and Pricing Calculation
 */
export const validateAndCalculateCoupon = async ({
  code,
  propertyId,
  roomCost = 0,
  cartAmount = 0,
  bookingType = 'guest',
  guestMobile = '',
  guestEmail = '',
  currentBookingId = null
}) => {
  if (!code || !String(code).trim()) {
    return { valid: false, error: 'EmptyCode', message: 'Please enter a coupon code.' };
  }

  const cleanCode = String(code).trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: cleanCode });

  if (!coupon) {
    return { valid: false, error: 'NotFound', message: `Coupon code "${cleanCode}" is invalid.` };
  }

  if (coupon.status !== 'Active') {
    return { valid: false, error: 'Inactive', message: `Coupon code "${cleanCode}" is no longer active.` };
  }

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return { valid: false, error: 'NotStarted', message: 'This coupon offer has not started yet.' };
  }

  const endDate = coupon.endDate || coupon.expiry;
  if (endDate && new Date(endDate) < now) {
    return { valid: false, error: 'Expired', message: `Coupon code "${cleanCode}" has expired.` };
  }

  // Check audience (B2B Travel Agent vs B2C Direct Customer)
  const audience = coupon.targetAudience || 'both';
  if (bookingType === 'agent' && audience === 'customer') {
    return { valid: false, error: 'AudienceMismatch', message: 'This coupon is exclusively for Direct Guest bookings.' };
  }
  if (bookingType === 'guest' && audience === 'agent') {
    return { valid: false, error: 'AudienceMismatch', message: 'This coupon is exclusively for Travel Agent B2B bookings.' };
  }

  // Check property eligibility
  if (!propertyId) {
    return { valid: false, error: 'MissingProperty', message: 'Property information is required to validate coupon.' };
  }

  let propertyDoc = await Property.findOne({
    $or: [
      { _id: mongoose.isValidObjectId(propertyId) ? propertyId : null },
      { propertyId: propertyId }
    ].filter(Boolean)
  });

  if (!propertyDoc) {
    return { valid: false, error: 'PropertyNotFound', message: 'Homestay property not found.' };
  }

  if (!await isCouponApplicableToProperty(coupon, propertyDoc)) {
    return { valid: false, error: 'IneligibleProperty', message: 'This coupon is not valid for this homestay.' };
  }

  // Check min / max cart amount (evaluating on eligible roomCost or cartAmount)
  const evalAmount = Number(roomCost) || Number(cartAmount) || 0;
  const minCart = coupon.minCartAmount || coupon.minOrder || 0;
  if (minCart > 0 && evalAmount < minCart) {
    return {
      valid: false,
      error: 'MinCartNotMet',
      message: `Minimum booking amount of ₹${Number(minCart).toLocaleString()} required to use this coupon.`
    };
  }

  const maxCart = coupon.maxCartAmount;
  if (maxCart && maxCart > 0 && evalAmount > maxCart) {
    return {
      valid: false,
      error: 'MaxCartExceeded',
      message: `This coupon is only applicable for bookings up to ₹${Number(maxCart).toLocaleString()}.`
    };
  }

  // Check total usage limit
  const maxUses = coupon.totalUsageLimit !== undefined ? coupon.totalUsageLimit : (coupon.maxUses || 0);
  if (maxUses > 0) {
    const isSelfBooking = currentBookingId && Array.isArray(coupon.usedBy) && coupon.usedBy.some(u => String(u.bookingId) === String(currentBookingId));
    if (!isSelfBooking && (coupon.usedCount || 0) >= maxUses) {
      return { valid: false, error: 'LimitExhausted', message: 'This coupon limit has been fully redeemed.' };
    }
  }

  // Check single user limit
  const userIdentifier = (guestMobile || guestEmail || '').trim().toLowerCase();
  const perUser = coupon.perUserLimit !== undefined ? coupon.perUserLimit : 1;
  if (userIdentifier && perUser > 0 && Array.isArray(coupon.usedBy)) {
    const userUses = coupon.usedBy.filter(u => {
      if (currentBookingId && String(u.bookingId) === String(currentBookingId)) return false;
      return u.userIdentifier && u.userIdentifier.toLowerCase() === userIdentifier;
    }).length;

    if (userUses >= perUser) {
      return {
        valid: false,
        error: 'UserLimitExceeded',
        message: `You have already redeemed this coupon the maximum allowed (${perUser} time${perUser > 1 ? 's' : ''}).`
      };
    }
  }

  // Calculate discount
  const discountType = coupon.discountType || coupon.type || 'percentage';
  const discountValue = coupon.discountValue !== undefined ? coupon.discountValue : (coupon.value || 0);
  let discountAmount = 0;

  if (discountType === 'percentage') {
    discountAmount = Math.round((evalAmount * Number(discountValue)) / 100);
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
    }
  } else {
    discountAmount = Math.min(evalAmount, Number(discountValue));
  }
  discountAmount = Math.max(0, discountAmount);

  const netTaxableAmount = Math.max(0, evalAmount - discountAmount);
  const tax = Math.round(netTaxableAmount * 0.12);
  const newTotal = Math.max(0, evalAmount - discountAmount);
  const finalAmountWithTax = netTaxableAmount + tax;

  return {
    valid: true,
    message: `Coupon "${coupon.code}" applied! You save ₹${Number(discountAmount).toLocaleString()}`,
    coupon: {
      _id: coupon._id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      discountType,
      discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minCartAmount: minCart
    },
    couponDoc: coupon,
    discountAmount,
    netTaxableAmount,
    tax,
    newTotal,
    finalAmountWithTax
  };
};

/**
 * Concurrency-safe Atomic Coupon Redemption
 */
export const atomicRedeemCoupon = async ({ couponId, userIdentifier, bookingId, discountAmount }) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) return { success: false, reason: 'CouponNotFound' };

  const maxUses = coupon.totalUsageLimit !== undefined ? coupon.totalUsageLimit : (coupon.maxUses || 0);

  const filter = {
    _id: couponId,
    status: 'Active'
  };

  if (maxUses > 0) {
    filter.usedCount = { $lt: maxUses };
  }

  const update = {
    $inc: { usedCount: 1 },
    $push: {
      usedBy: {
        userIdentifier: (userIdentifier || 'Guest').trim().toLowerCase(),
        bookingId: String(bookingId),
        discountAmount: Number(discountAmount) || 0,
        usedAt: new Date()
      }
    }
  };

  const updated = await Coupon.findOneAndUpdate(filter, update, { new: true });
  if (!updated) {
    return { success: false, reason: 'UsageLimitExhausted' };
  }
  return { success: true, coupon: updated };
};

/**
 * Atomic Coupon Usage Restoration (Cancellation, Rejection, Coupon Removal)
 */
export const atomicRestoreCoupon = async ({ couponCode, bookingId }) => {
  if (!couponCode) return;
  const cleanCode = String(couponCode).trim().toUpperCase();

  await Coupon.findOneAndUpdate(
    { code: cleanCode, usedCount: { $gt: 0 } },
    {
      $inc: { usedCount: -1 },
      $pull: { usedBy: { bookingId: String(bookingId) } }
    }
  );
};
