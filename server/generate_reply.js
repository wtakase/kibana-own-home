import getKibanaIndex from './get_kibana_index';

export default function (server, request, remoteUser, groups) {
  return {
    currentKibanaIndex: getKibanaIndex(server, request, remoteUser),
    kibanaIndexPrefix: server.config().get('kibana.index'),
    username: remoteUser,
    groups: groups
  };
};
