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
      const getGenerateReply = async function () {
        const remoteUser = getRemoteUser(server, request);
        let groups = null;
        if (remoteUser) {
          const currentKibanaIndex = await getKibanaIndex(server, request, remoteUser);
          const kibanaIndexPrefix = config.get('kibana.index');
          server.log(['plugin:own-home', 'debug'], 'currentKibanaIndex: ' + currentKibanaIndex);
          const kibanaIndexSuffix = request.params.suffix ? encodeURIComponent(request.params.suffix) : null;
          let isValidated = false;
          if (kibanaIndexSuffix) {
            isValidated = await validate(server, request, remoteUser, kibanaIndexSuffix);
          }
          if (isValidated) {
            setKibanaIndex(server, request, remoteUser, kibanaIndexSuffix);
          }
          groups = await getGroups(server, request, remoteUser);
        }
        return generateReply(server, request, remoteUser, groups);
      }
      return getGenerateReply();
    }
  });
};
