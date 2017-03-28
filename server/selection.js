import generateReply from './generate_reply';
import getGroups from './get_groups';
import getKibanaIndex from './get_kibana_index';
import getRemoteUser from './get_remote_user';
import validate from './validate';

export default function (server) {

  const config = server.config();

  server.route({
    path: '/api/own_home/selection/{suffix?}',
    method: 'GET',
    handler(request, reply) {
      const remoteUser = getRemoteUser(config, request);
      if (remoteUser) {
        const currentKibanaIndex = getKibanaIndex(server, request, remoteUser);
        const kibanaIndexPrefix = config.get('kibana.index');
        server.log(['plugin:own-home', 'debug'], 'currentKibanaIndex: ' + currentKibanaIndex);
        const kibanaIndexSuffix = request.params.suffix ? encodeURIComponent(request.params.suffix) : null;
        if (kibanaIndexSuffix) {
          validate(server, request, remoteUser, kibanaIndexSuffix, reply);
        } else {
          getGroups(server, request, remoteUser, reply);
        }
      } else {
        reply(generateReply(server, request, remoteUser, null));
      }
    }
  });
};
