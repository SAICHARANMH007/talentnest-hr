'use strict';

const ok  = (value) => ({ valid: true, value });
const err = (error) => ({ valid: false, error });

const v = {
  email: (e) => {
    if (!e) return err('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return err('Invalid email format');
    return ok(e.toLowerCase().trim());
  },
  name: (n) => {
    if (!n || typeof n !== 'string') return err('Name is required');
    n = n.trim();
    if (n.length < 2)  return err('Name too short (min 2 chars)');
    if (n.length > 100) return err('Name too long');
    return ok(n);
  },
  password: (p) => {
    if (!p || p.length < 8) return err('Password must be at least 8 characters');
    if (!/[A-Z]/.test(p))   return err('Password needs at least one uppercase letter');
    if (!/[0-9]/.test(p))   return err('Password needs at least one number');
    return ok(p);
  },
  phone: (p) => {
    if (!p) return ok(undefined);
    const c = p.replace(/\D/g, '');
    if (c.length < 7 || c.length > 15) return err('Invalid phone number');
    return ok(p.trim());
  },
  jobTitle: (t) => {
    if (!t) return err('Job title is required');
    t = t.trim();
    if (t.length < 3)  return err('Job title too short');
    if (t.length > 150) return err('Job title too long');
    return ok(t);
  },
  required: (val, name) => {
    if (!val && val !== 0) return err(`${name} is required`);
    return ok(val);
  },
};

// Run multiple validations → collect all errors
const runValidations = (checks) => {
  const errors = [], values = {};
  for (const [field, result] of Object.entries(checks)) {
    if (!result.valid) errors.push(result.error);
    else if (result.value !== undefined) values[field] = result.value;
  }
  return { errors, values, hasErrors: errors.length > 0 };
};

module.exports = { v, runValidations };
