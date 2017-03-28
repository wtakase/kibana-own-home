import getLdapGroups from './ldap/get_groups';
import getLocalGroups from './local/get_groups';

export default function (server, request, remoteUser) {

  const config = server.config();

  let groups = [];

  if (config.get('own_home.local.enabled')) {
    Array.prototype.push.apply(groups, getLocalGroups(server));
  }

  if (config.get('own_home.ldap.enabled')) {
    Array.prototype.push.apply(groups, getLdapGroups(server, request, remoteUser));
  }

  server.log(['plugin:own-home', 'debug'], 'Found groups: ' + groups.toString());
  return groups;
};
