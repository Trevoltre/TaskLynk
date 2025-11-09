/**
 * Centralized payment calculation functions for TaskLynk
 * 
 * Payment split: 70% to freelancer, 30% to admin
 */

/**
 * Calculate freelancer earnings (70% of client payment)
 */
export function calculateFreelancerAmount(clientPayment: number): number {
  return Math.round(clientPayment * 0.7 * 100) / 100;
}

/**
 * Calculate admin commission (30% of client payment)
 */
export function calculateAdminCommission(clientPayment: number): number {
  return Math.round(clientPayment * 0.3 * 100) / 100;
}