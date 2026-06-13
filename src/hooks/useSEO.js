import { useEffect } from 'react';

const BASE_URL = 'https://www.talentnesthr.com';

const setMeta = (selector, attr, val, content) => {
  let el = document.querySelector(selector);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, val); document.head.appendChild(el); }
  el.setAttribute('content', content);
};

// Sets document title, meta description, OG/Twitter tags, canonical link, and optional JSON-LD schema for a page.
export default function useSEO({ title, description, path = '/', keywords, schema }) {
  useEffect(() => {
    if (title) document.title = title;

    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }
    if (keywords) setMeta('meta[name="keywords"]', 'name', 'keywords', keywords);

    setMeta('meta[name="robots"]', 'name', 'robots', 'index, follow');
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    if (title) {
      setMeta('meta[property="og:title"]', 'property', 'og:title', title);
      setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    }
    setMeta('meta[property="og:url"]', 'property', 'og:url', `${BASE_URL}${path}`);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'TalentNest HR');
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `${BASE_URL}${path}`;

    const ldId = 'tn-page-ld';
    let ldScript = document.getElementById(ldId);
    if (schema) {
      if (!ldScript) {
        ldScript = document.createElement('script');
        ldScript.id = ldId;
        ldScript.type = 'application/ld+json';
        document.head.appendChild(ldScript);
      }
      ldScript.textContent = JSON.stringify(schema);
    } else if (ldScript) {
      ldScript.remove();
    }

    return () => {
      const el = document.getElementById(ldId);
      if (el) el.remove();
    };
  }, [title, description, path, keywords, schema]);
}
