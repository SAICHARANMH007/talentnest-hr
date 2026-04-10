import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, passes: 2, dead_code: true, pure_funcs: ['console.log', 'console.warn', 'console.info'] },
      format: { comments: false },
    },
    rollupOptions: {
      output: {
        // Fine-grained manual chunks — each role group gets its own chunk so the
        // browser only downloads what the logged-in user actually needs.
        manualChunks(id) {
          // ── Vendor: only split heavy libs that are loaded lazily ──────────
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          // PDF + XLSX are only used in specific flows — keep isolated so the
          // main bundle never pays for them on initial load.
          if (id.includes('node_modules/pdfjs-dist')) return 'vendor-pdf';
          if (id.includes('node_modules/xlsx')) return 'vendor-xlsx';
          if (id.includes('node_modules/jszip')) return 'vendor-zip';

          // ── Data ──────────────────────────────────────────────────────────
          if (id.includes('src/data/blogs')) return 'data-blogs';

          // ── Shared utils / components (loaded by many pages) ─────────────
          if (id.includes('src/components/charts')) return 'ui-charts';
          if (id.includes('src/components/shared')) return 'ui-shared';
          if (id.includes('src/utils/fileParser') || id.includes('src/utils/resumeParser')) return 'util-parser';

          // ── Superadmin pages — one chunk per page ─────────────────────────
          if (id.includes('src/pages/superadmin/SuperAdminOrgs')) return 'sa-orgs';
          if (id.includes('src/pages/superadmin/SuperAdminPlatform')) return 'sa-platform';
          if (id.includes('src/pages/superadmin/SuperAdminSecurity')) return 'sa-security';
          if (id.includes('src/pages/superadmin/SuperAdminPermissions')) return 'sa-permissions';
          if (id.includes('src/pages/superadmin/SuperAdminPlaybooks')) return 'sa-playbooks';
          if (id.includes('src/pages/superadmin/SuperAdminBlogs')) return 'sa-blogs';
          if (id.includes('src/pages/superadmin/SuperAdminAuditLogs')) return 'sa-audit';
          if (id.includes('src/pages/superadmin/SuperAdminCandidateImport')) return 'sa-import';
          if (id.includes('src/pages/superadmin/SuperAdminCandidateRequests')) return 'sa-requests';

          // ── Admin pages — one chunk per page ─────────────────────────────
          if (id.includes('src/pages/admin/AdminAnalytics')) return 'adm-analytics';
          if (id.includes('src/pages/admin/AdminPipeline')) return 'adm-pipeline';
          if (id.includes('src/pages/admin/AdminUsers')) return 'adm-users';
          if (id.includes('src/pages/admin/AdminJobs')) return 'adm-jobs';
          if (id.includes('src/pages/admin/OrgSettings')) return 'adm-orgsettings';
          if (id.includes('src/pages/admin/OutreachTracker')) return 'adm-outreach';
          if (id.includes('src/pages/admin/AdminAutomation')) return 'adm-automation';
          if (id.includes('src/pages/admin/AdminCustomFields')) return 'adm-fields';
          if (id.includes('src/pages/admin/AdminClients')) return 'adm-clients';
          if (id.includes('src/pages/admin/ContactLeads')) return 'adm-leads';
          if (id.includes('src/pages/admin/AdminOnboarding')) return 'adm-onboarding';
          if (id.includes('src/pages/admin')) return 'adm-misc';

          // ── Recruiter pages ───────────────────────────────────────────────
          if (id.includes('src/pages/recruiter/RecruiterPipeline')) return 'rec-pipeline';
          if (id.includes('src/pages/recruiter/RecruiterCandidates')) return 'rec-candidates';
          if (id.includes('src/pages/recruiter/RecruiterDashboard')) return 'rec-dashboard';
          if (id.includes('src/pages/recruiter/RecruiterAssessments')) return 'rec-assessments';
          if (id.includes('src/pages/recruiter')) return 'rec-misc';

          // ── Candidate pages ───────────────────────────────────────────────
          if (id.includes('src/pages/candidate/CandidateDashboard')) return 'cand-dashboard';
          if (id.includes('src/pages/candidate/CandidateProfile') || id.includes('src/pages/candidate/ResumeBuilder')) return 'cand-profile';
          if (id.includes('src/pages/candidate')) return 'cand-misc';

          // ── Marketing pages ───────────────────────────────────────────────
          if (id.includes('src/pages/marketing/LandingPage')) return 'mkt-landing';
          if (id.includes('src/pages/marketing/BlogPage') || id.includes('src/pages/marketing/BlogPostPage')) return 'mkt-blog';
          if (id.includes('src/pages/marketing')) return 'mkt-misc';

          // ── Auth ──────────────────────────────────────────────────────────
          if (id.includes('src/pages/auth')) return 'pages-auth';
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
