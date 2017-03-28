import getKibanaIndex from './get_kibana_index';

export default function (server, request, remoteUser, groups) {
  const config = server.config();

  const currentIndex = remoteUser ? getKibanaIndex(server, request, remoteUser) : config.get('kibana.index');
  const prefix = remoteUser ? config.get('kibana.index') : '';
  const isExplicitMode = remoteUser && config.get('own_home.explicit_kibana_index_url.enabled');
  const backHref = isExplicitMode === true ? '/' + currentIndex.slice(prefix.length + 1) + '/app/kibana' : './kibana';

  return {
    currentKibanaIndex: currentIndex,
    kibanaIndexPrefix: prefix,
    username: remoteUser || '',
    groups: groups || [],
    explicitMode: isExplicitMode === true ? 'true' : 'false',
    backHref: backHref
  };
};
