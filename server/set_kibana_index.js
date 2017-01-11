import createKibanaIndex from './proxy/create_kibana_index';
import migrateConfig from './proxy/migrate_config';
import createClient from './proxy/create_client';

export default function (server, request, remoteUser, suffix) {

  const replacedIndex = server.config().get('kibana.index') + '_' + suffix;
  request.yar.set(remoteUser, { key: replacedIndex });

  const client = createClient(server);
  client.indices.exists({ index: replacedIndex, ignoreUnavailable: false }).then(function (exists) {
    if (exists === true) {
      // Ignore 409 error: 'document_already_exists_exception'
      migrateConfig(server, replacedIndex, [409]);
    } else {
      createKibanaIndex(server, replacedIndex);
    }
  });
};
