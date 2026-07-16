function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

module.exports = {
  slugify,
  sqlString,
}
