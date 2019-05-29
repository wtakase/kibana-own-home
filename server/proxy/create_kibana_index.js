module.exports = function (server, index) {
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const originalIndex = server.config().get('kibana.index') + '_1';
  return callWithInternalUser('indices.create', {
    index: index
  })
  .catch(() => {
    throw new Error(`Unable to create Kibana index "${index}"`);
  })
  .then(function () {
    return callWithInternalUser('indices.getMapping', {
      index: originalIndex
    });
  })
  .catch(() => {
    throw new Error(`Unable to get mapping from Kibana index "${originalIndex}"`);
  })
  .then(function (mapping) {
    return callWithInternalUser('indices.putMapping', {
      index: index,
      body: mapping[originalIndex]["mappings"]
    });
  })
  .catch(() => {
    throw new Error(`Unable to put mapping to Kibana index "${index}"`);
  })
  .then(function () {
    return callWithInternalUser('reindex', {
      body: {
        source: {
          index: originalIndex
        },
        dest: {
          index: index
        }
      }
    });
  })
  .catch(() => {
    throw new Error(`Unable to reindex from Kibana index "${originalIndex}" to "${index}"`);
  })
  .then(function () {
    return callWithInternalUser('cluster.health', {
      waitForStatus: 'yellow',
      index: index
    })
    .catch(() => {
      throw new Error(`Waiting for Kibana index "${index}" to come online failed.`);
    });
  });
};
