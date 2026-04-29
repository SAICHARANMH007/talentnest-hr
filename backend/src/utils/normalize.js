/**
 * Recursive normalizer — strips Mongoose internals, converts ObjectIds to strings.
 *
 * Root cause fix (2026-04-29): MongoDB Node.js driver v4+ changed _bsontype from
 * 'ObjectID' to 'ObjectId' (lowercase d). The old check missed the new casing,
 * causing tenantId/orgId/etc. to serialize as {"buffer":{"type":"Buffer","data":[]}}
 * instead of a 24-char hex string, breaking every role's auth flow.
 */

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

function isObjectId(v) {
  if (!v || typeof v !== 'object') return false;
  // instanceof is the most reliable check across driver versions
  if (v instanceof ObjectId) return true;
  // fallback: cover both _bsontype casings ('ObjectID' v3 and 'ObjectId' v4+)
  const bt = v._bsontype;
  return bt === 'ObjectId' || bt === 'ObjectID';
}

function normalize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  // Date → ISO string
  if (obj instanceof Date) return obj.toISOString();

  // ObjectId → hex string (must come before toObject() call)
  if (isObjectId(obj)) return obj.toString();

  // Mongoose document → plain object
  let data = obj;
  if (typeof obj.toObject === 'function') {
    data = obj.toObject({ virtuals: true, getters: true });
  }

  // After toObject() the result may again be an ObjectId for a single-ref field
  if (isObjectId(data)) return data.toString();

  // Array
  if (Array.isArray(data)) return data.map(normalize);

  // Plain object
  const cleaned = {};
  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

    // Strip private Mongoose/BSON internals
    if (key === '__v') continue;
    if (key === 'password' || key === 'passwordHash') continue;
    if (key === 'resetPasswordToken' || key === 'resetPasswordExpires') continue;

    // _id → promote to id string, then skip the raw _id
    if (key === '_id') {
      if (data._id) cleaned.id = data._id.toString();
      continue;
    }

    const value = data[key];

    // Any ObjectId value → string
    if (isObjectId(value)) {
      cleaned[key] = value.toString();
      continue;
    }

    // Recurse into objects/arrays; pass scalars through as-is
    cleaned[key] = (value !== null && typeof value === 'object') ? normalize(value) : value;
  }

  return cleaned;
}

module.exports = normalize;
