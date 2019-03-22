import getKibanaIndex from './get_kibana_index';

export default function (server, request, remoteUser, groups) {
  const generateReply = async function () {
    const config = server.config();

    let currentIndex;
    if (remoteUser) {
      currentIndex = await getKibanaIndex(server, request, remoteUser);
    } else {
      currentIndex = config.get('kibana.index');
    }
    const prefix = remoteUser ? config.get('kibana.index') : '';
    const backHref = './kibana';

    return {
      currentKibanaIndex: currentIndex,
      kibanaIndexPrefix: prefix,
      username: remoteUser || '',
      groups: groups || [],
      backHref: backHref
    };
  }
  return generateReply();
};
