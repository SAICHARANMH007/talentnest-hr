'use strict';

/**
 * Mongoose Soft-Delete Plugin — Enterprise Standard
 * Automatically adds 'deletedAt' and global 'find' filtering.
 */
module.exports = function softDeletePlugin(schema) {
  // 1. Add the archival field
  schema.add({
    deletedAt: { type: Date, default: null, index: true }
  });

  // 2. Global Query Filter (Hidden by default)
  schema.pre(/^find/, function(next) {
    // Support both query-level and options-level includeDeleted flag
    const query = this.getQuery();
    if (query.includeDeleted || this.getOptions().includeDeleted) {
      delete query.includeDeleted; // Remove from actual MongoDB query
      return next();
    }
    this.where({ deletedAt: null });
    next();
  });

  // 3. Helper Method: Soft Delete
  schema.methods.softDelete = function() {
    this.deletedAt = new Date();
    return this.save();
  };

  // 4. Helper Method: Restore
  schema.methods.restore = function() {
    this.deletedAt = null;
    return this.save();
  };
};
