/**
 * Detect generic job board search pages — these should NOT redirect, all applications
 * go through TalentNest HR. Real company career pages (e.g. careers.tcs.com) are kept.
 */
export function isJobBoardSearchUrl(url) {
  if (!url) return false;
  const lUrl = url.toLowerCase();
  return (
    lUrl.includes('naukri.com') ||
    lUrl.includes('linkedin.com/jobs/search') ||
    (lUrl.includes('indeed.com') && lUrl.includes('/jobs')) ||
    lUrl.includes('glassdoor.co.in/Jobs') ||
    lUrl.includes('glassdoor.com/Job') ||
    lUrl.includes('shine.com/job-search') ||
    lUrl.includes('monster.com/jobs') ||
    lUrl.includes('simplyhired.co.in') ||
    lUrl.includes('timesjobs.com')
  );
}

/**
 * Returns the effective externalUrl — null if it's a generic job board search page.
 * Used to determine if a job application should be redirected to a company site.
 */
export function getCompanyCareerUrl(externalUrl) {
  if (!externalUrl || isJobBoardSearchUrl(externalUrl)) return null;
  return externalUrl;
}
