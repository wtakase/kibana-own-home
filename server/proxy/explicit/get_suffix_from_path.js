module.exports = function (path) {
  const suffix = path.split('/')[1];
  if (['app', 'ui', 'bundles', 'api', 'plugins', 'elasticsearch', 'es_admin'].indexOf(suffix) >= 0) {
    return null;
  } else {
    return suffix;
  }
};
