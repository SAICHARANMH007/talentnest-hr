// Build a regex that matches a phone number search query against stored phone
// numbers regardless of spacing, dashes, parentheses, or country-code prefix —
// similar to how WhatsApp contact search works.
function phoneSearchRegex(rawSearch) {
  const digits = String(rawSearch || '').replace(/\D/g, '');
  if (!digits) return null;
  const core = digits.length > 10 ? digits.slice(-10) : digits;
  if (!core) return null;
  const pattern = core.split('').join('[^0-9]*');
  return new RegExp(pattern, 'i');
}

module.exports = { phoneSearchRegex };
