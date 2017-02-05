import getKibanaIndex from './get_kibana_index';

export default function (server, request, remoteUser, groups) {
  const isExplicitMode = server.config().get('own_home.explicit_kibana_index_url.enabled');
  const currentKibanaIndex = getKibanaIndex(server, request, remoteUser);
  const kibanaIndexPrefix = server.config().get('kibana.index');
  return {
    currentKibanaIndex: currentKibanaIndex,
    kibanaIndexPrefix: kibanaIndexPrefix,
    username: remoteUser,
    groups: groups,
    explicitMode: isExplicitMode === true ? 'true' : 'false',
    backHref: isExplicitMode === true ? '/' + currentKibanaIndex.slice(kibanaIndexPrefix.length + 1) + '/app/kibana' : './kibana'
  };
};
