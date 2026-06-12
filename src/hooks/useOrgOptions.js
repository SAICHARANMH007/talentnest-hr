import { useState, useEffect } from 'react';
import { api } from '../api/api.js';
import { INDUSTRIES, DEPARTMENTS } from '../constants/picklists.js';
import { STAGES, DB_TO_FRONTEND_STAGE } from '../constants/stages.js';
import { DEFAULT_SOURCES } from '../constants/sources.js';

// Module-level cache so every component re-render doesn't re-fetch
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Returns merged dropdown options from org customizations + hardcoded defaults.
 * departments, locations, sources are extended with any org-specific entries.
 * stages overlays org colors/labels onto the default pipeline stages.
 */
export function useOrgOptions() {
  const [departments, setDepartments]       = useState(DEPARTMENTS);
  const [industries, setIndustries]         = useState(INDUSTRIES);
  const [locations, setLocations]           = useState([]);
  const [branches, setBranches]             = useState([]);
  const [sources, setSources]               = useState([]);
  const [stages, setStages]                 = useState(STAGES);
  const [fieldVisibility, setFieldVisibility] = useState({});
  const [loaded, setLoaded]                 = useState(false);

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

      // Org branches/locations (from Org Settings → Branches & Locations)
      setBranches(data.branches || []);

      // Org sources merged with defaults
      const orgSrcs = (data.sources || []).map(s => s.name || s).filter(Boolean);
      setSources(Array.from(new Set([...DEFAULT_SOURCES, ...orgSrcs])));

      // Org pipeline stages — overlay colors onto defaults, append custom stages
      const orgStatuses = (data.pipelineStatuses || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      if (orgStatuses.length > 0) {
        const colorMap = {};
        orgStatuses.forEach(os => {
          const id = DB_TO_FRONTEND_STAGE[os.name]
            || os.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          colorMap[id] = { color: os.color, label: os.name };
        });
        const defaultIds = new Set(STAGES.map(s => s.id));
        const updated = STAGES.map(s =>
          colorMap[s.id] ? { ...s, color: colorMap[s.id].color || s.color } : s
        );
        orgStatuses.forEach(os => {
          const id = DB_TO_FRONTEND_STAGE[os.name]
            || os.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          if (!defaultIds.has(id)) {
            updated.push({ id, label: os.name, icon: '📌', color: os.color || '#706E6B' });
          }
        });
        setStages(updated);
      }

      // Field visibility map — undefined means ON (default visible)
      setFieldVisibility(data.fieldVisibility || {});
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Helper: returns true if feature is visible (defaults to true if not configured)
  const isVisible = (key) => fieldVisibility[key] !== false;

  return { departments, industries, locations, branches, sources, stages, fieldVisibility, isVisible, loaded };
}

/** Call this after admin saves customizations to bust the cache. */
export function clearOrgOptionsCache() {
  _cache   = null;
  _cacheAt = 0;
}
