/**
 * Rating calculation utilities for auto-calculating user ratings
 */

/**
 * Calculate client rating based on payment history and behavior
 * @param completedJobs - Total completed jobs
 * @param paidOnTime - Jobs paid without delay
 * @param totalSpent - Total amount spent
 * @returns Rating from 1-5
 */
export const calculateClientRating = (
  completedJobs: number,
  paidOnTime: number,
  totalSpent: number
): number => {
  if (completedJobs === 0) return 3; // Default neutral rating
  
  // Payment reliability: 60% weight
  const paymentReliability = paidOnTime / completedJobs;
  const paymentScore = paymentReliability * 3; // Max 3 points
  
  // Spending activity: 20% weight (more spending = higher rating)
  const spendingScore = Math.min(totalSpent / 10000, 1) * 1; // Max 1 point
  
  // Completion rate: 20% weight
  const completionScore = Math.min(completedJobs / 10, 1) * 1; // Max 1 point
  
  const totalScore = paymentScore + spendingScore + completionScore;
  
  // Convert to 1-5 scale
  const rating = Math.max(1, Math.min(5, totalScore));
  return Math.round(rating * 10) / 10; // Round to 1 decimal
};

/**
 * Calculate freelancer rating based on performance metrics
 * @param completedJobs - Total completed jobs
 * @param onTimeDeliveries - Jobs delivered on time
 * @param clientRatings - Array of ratings received from clients
 * @param revisionsRequested - Total revisions requested
 * @returns Rating from 1-5
 */
export const calculateFreelancerRating = (
  completedJobs: number,
  onTimeDeliveries: number,
  clientRatings: number[],
  revisionsRequested: number
): number => {
  if (completedJobs === 0) return 3; // Default neutral rating
  
  // On-time delivery: 40% weight
  const deliveryRate = onTimeDeliveries / completedJobs;
  const deliveryScore = deliveryRate * 2; // Max 2 points
  
  // Client ratings: 40% weight
  const avgClientRating = clientRatings.length > 0 
    ? clientRatings.reduce((sum, r) => sum + r, 0) / clientRatings.length 
    : 3;
  const clientScore = (avgClientRating / 5) * 2; // Max 2 points
  
  // Quality (low revisions): 20% weight
  const revisionRate = revisionsRequested / completedJobs;
  const qualityScore = Math.max(0, 1 - revisionRate) * 1; // Max 1 point
  
  const totalScore = deliveryScore + clientScore + qualityScore;
  
  // Convert to 1-5 scale
  const rating = Math.max(1, Math.min(5, totalScore));
  return Math.round(rating * 10) / 10; // Round to 1 decimal
};

/**
 * Determine if delivery was on time
 * @param deadline - Job deadline
 * @param deliveredAt - When job was delivered
 * @returns true if delivered on time
 */
export const wasDeliveredOnTime = (deadline: string, deliveredAt: string): boolean => {
  const deadlineTime = new Date(deadline).getTime();
  const deliveryTime = new Date(deliveredAt).getTime();
  return deliveryTime <= deadlineTime;
};
