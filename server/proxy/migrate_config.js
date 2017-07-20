import upgrade from './upgrade_config';
import createClient from './create_client';

module.exports = function (server, index, ignore, mappings) {
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
