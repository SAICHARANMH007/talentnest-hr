/**
 * Professional Recursive Normalizer — High-End Performance
 * 
 * Replaces JSON.stringify/parse which was causing BSON serialization errors.
 * This function recursively strips internal Mongoose properties and
 * converts ObjectIds to strings.
 */
function normalize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Handle Date objects
  if (obj instanceof Date) return obj.toISOString();

  // Handle Mongoose documents
  let data = obj;
  if (typeof obj.toObject === 'function') {
    data = obj.toObject({ virtuals: true, getters: true });
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(normalize);
  }

  // Handle Plain Objects
  const cleaned = {};
  for (const key in data) {
    // Security & Cleanliness: Remove internal fields
    if (key === '__v' || key === '_id' || key === 'password' || key === 'resetPasswordToken' || key === 'resetPasswordExpires') {
      if (key === '_id' && data._id) cleaned.id = data._id.toString();
      continue;
    }
    
    const value = data[key];
    
    // Convert Mongo IDs to strings even if nested
    if (value && value._bsontype === 'ObjectID') {
      cleaned[key] = value.toString();
      continue;
    }

    cleaned[key] = (typeof value === 'object' && value !== null) ? normalize(value) : value;
  }

  return cleaned;
}

module.exports = normalize;
