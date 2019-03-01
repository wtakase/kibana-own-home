import getKibanaIndex from './get_kibana_index';

export default function (server, request, remoteUser, groups) {
  const config = server.config();

  const currentIndex = remoteUser ? getKibanaIndex(server, request, remoteUser) : config.get('kibana.index');
  const prefix = remoteUser ? config.get('kibana.index') : '';
  const backHref = './kibana';

  return {
    currentKibanaIndex: currentIndex,
    kibanaIndexPrefix: prefix,
    username: remoteUser || '',
    groups: groups || [],
    backHref: backHref
  };
};
