import { PLAN_LIMITS } from './constants';

export function canUseAIExtraction(account) {
  if (!account) return false;
  const limits = PLAN_LIMITS[account.plan];
  if (!limits) return false;
  return account.ai_extractions_this_month < limits.aiExtractions;
}

export function canUseAIDigest(account) {
  if (!account) return false;
  const limits = PLAN_LIMITS[account.plan];
  if (!limits) return false;
  if (limits.aiDigests === -1) return true;
  return account.ai_digest_this_month < limits.aiDigests;
}

export function getRemainingExtractions(account) {
  if (!account) return 0;
  const limits = PLAN_LIMITS[account.plan];
  if (!limits) return 0;
  return Math.max(0, limits.aiExtractions - account.ai_extractions_this_month);
}
