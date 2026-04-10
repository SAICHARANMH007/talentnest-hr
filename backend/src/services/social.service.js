'use strict';
const logger = require('../middleware/logger');

/**
 * SocialService — Facebook & Instagram Graph API Integration
 */
class SocialService {
  /**
   * Post a Job to Facebook Page
   */
  async postToFacebook(job) {
    const pageId = process.env.FB_PAGE_ID;
    const token  = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!pageId || !token) {
      logger.info('Social skip: FB credentials missing.', { jobId: job._id });
      return { fb: 'skipped' };
    }

    const message = `🔥 We're Hiring! ${job.title} @ ${job.companyName || 'TalentNest Partner'}\n\n📍 ${job.location || 'Remote'} | ${job.type || 'Full-Time'}\n💰 ${job.salaryRange || 'Competitive'}\n\n👉 Apply now: ${process.env.FRONTEND_URL}/careers\n\n#hiring #jobs #recruitment #talentnesthr`;

    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ 
          message, 
          link: `${process.env.FRONTEND_URL}/careers`, 
          access_token: token 
        }),
      });
      const data = await res.json();
      return { fb: data.id ? 'posted' : 'failed', fbData: data };
    } catch (err) {
      logger.error('Facebook post failed', { error: err.message, jobId: job._id });
      return { fb: 'failed', error: err.message };
    }
  }

  /**
   * Post a Job to Instagram Business Account
   */
  async postToInstagram(job) {
    const igAccountId = process.env.IG_ACCOUNT_ID;
    const token       = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!igAccountId || !token) return { ig: 'skipped' };

    const imageUrl = process.env.IG_DEFAULT_IMAGE_URL || 'https://talentnesthr.com/og-image.png';
    const caption  = `🔥 We're Hiring!\n\n💼 ${job.title}\n🏢 ${job.companyName}\n📍 ${job.location}\n\n✅ Apply at talentnesthr.com/careers`;

    try {
      // Step 1: Create media container
      const containerRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
      });
      const container = await containerRes.json();
      if (!container.id) return { ig: 'failed', igData: container };

      // Step 2: Publish
      const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}/media_publish`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ creation_id: container.id, access_token: token }),
      });
      const published = await publishRes.json();
      return { ig: published.id ? 'posted' : 'failed', igData: published };
    } catch (err) {
      logger.error('Instagram post failed', { error: err.message, jobId: job._id });
      return { ig: 'failed', error: err.message };
    }
  }

  /**
   * Unified Auto-Post
   */
  async autoPostJob(job) {
    const [fbResult, igResult] = await Promise.allSettled([
      this.postToFacebook(job),
      this.postToInstagram(job),
    ]);
    return { 
      fb: fbResult.status === 'fulfilled' ? fbResult.value : { status: 'failed' },
      ig: igResult.status === 'fulfilled' ? igResult.value : { status: 'failed' }
    };
  }
}

module.exports = new SocialService();
