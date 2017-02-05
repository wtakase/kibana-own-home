import fetchGroups from './fetch_groups';
import validateKibanaIndex from './validate_kibana_index';
import getKibanaIndex from './get_kibana_index';

export default function (server) {

  const config = server.config();

  server.route({
    path: '/api/own_home/selection/{suffix?}',
    method: 'GET',
    handler(request, reply) {
      const kibanaIndexSuffix = request.params.suffix ? encodeURIComponent(request.params.suffix) : '';
      if (config.get('own_home.proxy_user_header') in request.headers) {
        const remoteUser = request.headers[config.get('own_home.proxy_user_header')];
        const currentKibanaIndex = getKibanaIndex(server, request, remoteUser);
        server.log(['plugin:own-home', 'debug'], 'currentKibanaIndex: ' + currentKibanaIndex);
        if (kibanaIndexSuffix !== '') {
          validateKibanaIndex(server, request, remoteUser, kibanaIndexSuffix, reply);
        } else {
          fetchGroups(server, request, remoteUser, reply);
        }
      } else {
        reply({
          currentKibanaIndex: config.get('kibana.index'),
          kibanaIndexPrefix: '',
          username: '',
          groups: [],
          explicitMode: 'false',
          backHref: './kibana'
        });
      }
    }
  });
};
