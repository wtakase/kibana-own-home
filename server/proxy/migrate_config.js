import upgrade from './upgrade_config';
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
            ignore_unmapped: true
          }
        }
      ]
    }
  };

  return client.search(options).then(upgrade(server, index, ignore));
};
