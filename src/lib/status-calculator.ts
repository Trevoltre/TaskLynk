/**
 * Automatic Status Calculator
 * Determines user tiers and badges based on completed orders
 */

export type ClientTier = 'basic' | 'silver' | 'gold' | 'platinum';
export type FreelancerBadge = 'bronze' | 'silver' | 'gold' | 'platinum' | 'elite';

/**
 * Calculate client tier based on completed orders
 */
export function calculateClientTier(completedOrders: number): ClientTier {
  if (completedOrders >= 50) return 'platinum';
  if (completedOrders >= 25) return 'gold';
  if (completedOrders >= 10) return 'silver';
  return 'basic';
}

/**
 * Calculate freelancer badge based on completed orders
 */
export function calculateFreelancerBadge(completedOrders: number): FreelancerBadge {
  if (completedOrders >= 100) return 'elite';
  if (completedOrders >= 50) return 'platinum';
  if (completedOrders >= 25) return 'gold';
  if (completedOrders >= 10) return 'silver';
  return 'bronze';
}

/**
 * Get tier/badge display information
 */
export function getClientTierInfo(tier: ClientTier) {
  const tierInfo = {
    basic: {
      label: 'Basic',
      color: 'bg-gray-500',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-100',
      description: '0-9 orders completed'
    },
    silver: {
      label: 'Silver',
      color: 'bg-gray-400',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-100',
      description: '10-24 orders completed'
    },
    gold: {
      label: 'Gold',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      description: '25-49 orders completed'
    },
    platinum: {
      label: 'Platinum',
      color: 'bg-purple-600',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
      description: '50+ orders completed'
    }
  };
  return tierInfo[tier];
}

export function getFreelancerBadgeInfo(badge: FreelancerBadge) {
  const badgeInfo = {
    bronze: {
      label: 'Bronze',
      color: 'bg-orange-700',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
      description: '0-9 orders completed'
    },
    silver: {
      label: 'Silver',
      color: 'bg-gray-400',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-100',
      description: '10-24 orders completed'
    },
    gold: {
      label: 'Gold',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      description: '25-49 orders completed'
    },
    platinum: {
      label: 'Platinum',
      color: 'bg-purple-600',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
      description: '50-99 orders completed'
    },
    elite: {
      label: 'Elite',
      color: 'bg-gradient-to-r from-purple-600 to-pink-600',
      textColor: 'text-purple-900',
      bgColor: 'bg-gradient-to-r from-purple-50 to-pink-50',
      description: '100+ orders completed'
    }
  };
  return badgeInfo[badge];
}

export function getClientPriorityInfo(priority: string) {
  const priorityInfo = {
    regular: {
      label: 'Regular',
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      description: 'Standard order priority'
    },
    priority: {
      label: 'Priority',
      color: 'bg-orange-500',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
      description: 'Higher order priority'
    },
    vip: {
      label: 'VIP',
      color: 'bg-red-600',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      description: 'Highest order priority'
    }
  };
  return priorityInfo[priority as keyof typeof priorityInfo] || priorityInfo.regular;
}
