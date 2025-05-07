function checkbody(obj, requiredFields) {
  for (const field of requiredFields) {
    if (
      !Object.prototype.hasOwnProperty.call(obj, field) ||
      typeof obj[field] !== "string" ||
      obj[field].trim().length === 0
    ) {
      return false;
    }
  }
  return true;
}

module.exports = { checkbody };
