/**
 * Download Restrictions Utility
 * 
 * ALL DOWNLOAD RESTRICTIONS REMOVED - All users can access all files
 */

/**
 * Check if a work type requires restricted downloads
 * @param workType - The work type to check
 * @returns false - all restrictions removed
 */
export function isRestrictedDownloadType(workType: string): boolean {
  // All restrictions removed - all work types are downloadable
  return false;
}

/**
 * Check if a user can download files for a given order
 * @param userRole - The role of the user (client, admin, freelancer)
 * @param workType - The work type of the order
 * @param orderStatus - The current status of the order
 * @returns true - all users can download all files
 */
export function canDownloadFiles(
  userRole: 'client' | 'admin' | 'freelancer',
  workType: string,
  orderStatus: string
): boolean {
  // All users can download all files - no restrictions
  return true;
}

/**
 * Get download restriction message for display
 * @param userRole - The role of the user
 * @param workType - The work type of the order
 * @param orderStatus - The current status of the order
 * @returns null - no restrictions exist
 */
export function getDownloadRestrictionMessage(
  userRole: 'client' | 'admin' | 'freelancer',
  workType: string,
  orderStatus: string
): string | null {
  // No restrictions - return null
  return null;
}