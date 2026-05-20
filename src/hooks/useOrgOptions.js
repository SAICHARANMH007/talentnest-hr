import { useState, useEffect } from 'react';
import { api } from '../api/api.js';
import { INDUSTRIES, DEPARTMENTS } from '../constants/picklists.js';

// Module-level cache so every component re-render doesn't re-fetch
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Returns merged dropdown options from org customizations + hardcoded defaults.
 * departments, locations, sources are extended with any org-specific entries.
 */
export function useOrgOptions() {
  const [departments, setDepartments] = useState(DEPARTMENTS);
  const [industries, setIndustries]   = useState(INDUSTRIES);
  const [locations, setLocations]     = useState([]);
  const [sources, setSources]         = useState([]);
  const [loaded, setLoaded]           = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Use module cache
      if (_cache && Date.now() - _cacheAt < CACHE_TTL) {
        apply(_cache);
        setLoaded(true);
        return;
      }
      try {
        const r = await api.getCustomizations();
        const data = r?.data || {};
        _cache  = data;
        _cacheAt = Date.now();
        if (!cancelled) {
          apply(data);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true); // fall back to defaults silently
      }
    }

    function apply(data) {
      // Merge org departments with hardcoded list, dedup, sort
      const orgDepts = (data.departments || []).map(d => d.name || d).filter(Boolean);
      const merged   = Array.from(new Set([...DEPARTMENTS, ...orgDepts])).sort();
      setDepartments(merged);

      // Org locations
      const orgLocs = (data.locations || []).map(l => l.name || l).filter(Boolean);
      setLocations(orgLocs);

      // Org sources
      const orgSrcs = (data.sources || []).map(s => s.name || s).filter(Boolean);
      setSources(orgSrcs);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { departments, industries, locations, sources, loaded };
}

/** Call this after admin saves customizations to bust the cache. */
export function clearOrgOptionsCache() {
  _cache   = null;
  _cacheAt = 0;
}
