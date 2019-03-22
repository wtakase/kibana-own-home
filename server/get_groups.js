import getLdapGroups from './ldap/get_groups';
import getLocalGroups from './local/get_groups';

export default function (server, request, remoteUser) {

  let groups = [];

  const getGroups = async function () {
    const config = server.config();

    if (config.get('own_home.local.enabled')) {
      Array.prototype.push.apply(groups, getLocalGroups(server));
    }

    if (config.get('own_home.ldap.enabled')) {
      const ldapGroups = await getLdapGroups(server, request, remoteUser);
      Array.prototype.push.apply(groups, ldapGroups);
    }

    server.log(['plugin:own-home', 'debug'], 'Found groups: ' + groups.toString());
    return groups;
  }
  return getGroups();
};
