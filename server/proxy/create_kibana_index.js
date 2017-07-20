import SetupError from '../../../../src/core_plugins/elasticsearch/lib/setup_error';
import { format } from 'util';
import createClient from './create_client';

module.exports = function (server, index, mappings) {
  const client = createClient(server);

  function handleError(message) {
    return function (err) {
      throw new SetupError(server, message, err);
    };
  }

  return client.indices.create({
    index: index,
    body: {
      settings: {
        number_of_shards: 1
      },
      mappings
    }
  })
  .catch(handleError('Unable to create Kibana index "<%= kibana.index %>"'))
  .then(function () {
    return client.cluster.health({
      waitForStatus: 'yellow',
      index: index
    })
    .catch(handleError('Waiting for Kibana index "<%= kibana.index %>" to come online failed.'));
  });
};
