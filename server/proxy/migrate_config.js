import upgrade from './upgrade_config';
import { mappings } from '../../../../src/plugins/elasticsearch/lib/kibana_index_mappings';
import createClient from './create_client';

module.exports = function (server, index, ignore) {
  const config = server.config();
  const client = createClient(server);
  const options =  {
    index: index,
    type: 'config',
    body: {
      size: 1000,
      sort: [
        {
          buildNum: {
            order: 'desc',
            unmapped_type: mappings.config.properties.buildNum.type
          }
        }
      ]
    }
  };

  return client.search(options).then(upgrade(server, index, ignore));
};
