// Freelancer utilities - extracted to avoid HMR issues

export const STATUS_MAP: Record<string, string[]> = {
  'on-hold': ['on_hold', 'on-hold', 'assigned', 'pending_assignment'],
  'in-progress': ['in_progress', 'assigned'],
  'editing': ['editing'],
  'done': ['delivered'],
  'delivered': ['delivered'],
  'revision': ['revision'],
  'approved': ['approved'],
  'completed': ['completed'],
  'cancelled': ['cancelled', 'canceled'],
};

/**
 * Calculate freelancer earnings - 70% of client payment
 * @param clientAmount - Total amount paid by client
 * @returns Freelancer earnings (70% of client payment)
 */
export const calculateFreelancerEarnings = (clientAmount: number): number => {
  return Math.round(clientAmount * 0.7 * 100) / 100; // 70% of client payment
};

/**
 * Calculate admin commission - 30% of client payment
 * @param clientAmount - Total amount paid by client
 * @returns Admin commission (30% of client payment)
 */
export const calculateAdminCommission = (clientAmount: number): number => {
  return Math.round(clientAmount * 0.3 * 100) / 100; // 30% of client payment
};