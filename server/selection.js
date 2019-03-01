import generateReply from './generate_reply';
import getGroups from './get_groups';
import getKibanaIndex from './get_kibana_index';
import setKibanaIndex from './set_kibana_index';
import getRemoteUser from './get_remote_user';
import validate from './validate';

export default function (server) {

  const config = server.config();

  server.route({
    path: '/api/own_home/selection/{suffix?}',
    method: 'GET',
    handler(request, h) {
      const remoteUser = getRemoteUser(server, request);
      let groups = null;
      if (remoteUser) {
        const currentKibanaIndex = getKibanaIndex(server, request, remoteUser);
        const kibanaIndexPrefix = config.get('kibana.index');
        server.log(['plugin:own-home', 'debug'], 'currentKibanaIndex: ' + currentKibanaIndex);
        const kibanaIndexSuffix = request.params.suffix ? encodeURIComponent(request.params.suffix) : null;
        if (kibanaIndexSuffix && validate(server, request, remoteUser, kibanaIndexSuffix)) {
          setKibanaIndex(server, request, remoteUser, kibanaIndexSuffix);
        }
        groups = getGroups(server, request, remoteUser);
      }
      return generateReply(server, request, remoteUser, groups);
    }
  });
};
