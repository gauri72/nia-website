const PRORATION_THRESHOLD_DAYS = 180;

// Computes what an upgrade from the member's current tier to `targetTier` should cost.
// Only applies the proration/threshold rule for a genuine upgrade (moving to a pricier
// tier while already holding an active tier with a real expiry date) — new joins and
// downgrades/lateral moves always charge the target tier's full price.
// `member.membershipTier` must already be populated by the caller if present.
function computeUpgradeAmount(member, targetTier) {
  const currentTier = member.membershipTier;
  const isRealUpgrade = currentTier && targetTier.price > currentTier.price && member.membershipExpiresAt;

  if (!isRealUpgrade) {
    return {
      amount: targetTier.price,
      prorationApplied: false,
      daysRemaining: null,
      message: currentTier
        ? `Upgrading to ${targetTier.name} costs the full €${targetTier.price} — validity will be a fresh term starting today.`
        : `Joining ${targetTier.name} costs €${targetTier.price}.`,
    };
  }

  const daysRemaining = Math.ceil((member.membershipExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  if (daysRemaining > PRORATION_THRESHOLD_DAYS) {
    const amount = Math.max(0, Math.round((targetTier.price - currentTier.price) * 100) / 100);
    return {
      amount,
      prorationApplied: true,
      daysRemaining,
      message: `You have ${daysRemaining} days left on ${currentTier.name} — more than ${PRORATION_THRESHOLD_DAYS}, so upgrading to ${targetTier.name} costs €${amount} (€${targetTier.price} minus the €${currentTier.price} already paid for ${currentTier.name}). Your new validity will be a fresh term starting today.`,
    };
  }

  return {
    amount: targetTier.price,
    prorationApplied: false,
    daysRemaining,
    message: `You have ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left on ${currentTier.name} — ${PRORATION_THRESHOLD_DAYS} or fewer, so upgrading to ${targetTier.name} costs the full €${targetTier.price}. Your new validity will be a fresh term starting today.`,
  };
}

module.exports = { computeUpgradeAmount, PRORATION_THRESHOLD_DAYS };
