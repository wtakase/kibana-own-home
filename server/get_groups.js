import generateReply from './generate_reply';
import getLdapGroups from './ldap/get_groups';
import getLocalGroups from './local/get_groups';

export default function (server, request, remoteUser, callback) {

  const config = server.config();

  let groups = [];

  if (config.get('own_home.local.enabled')) {
    Array.prototype.push.apply(groups, getLocalGroups(server));
  }

  if (config.get('own_home.ldap.enabled')) {
    getLdapGroups(server, request, remoteUser, groups, callback);
  } else {
    server.log(['plugin:own-home', 'debug'], 'Found groups: ' + groups.toString());
    callback(generateReply(server, request, remoteUser, groups));
  }
};
