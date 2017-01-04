import fetchLdapGroups from './fetch_ldap_groups';
import generateReply from './generate_reply';

export default function (server, request, remoteUser, reply) {

  const config = server.config();

  let groups = [];

  if (config.get('own_home.local.enabled')) {
    Array.prototype.push.apply(groups, config.get('own_home.local.groups'));
  }

  if (config.get('own_home.ldap.enabled')) {
    fetchLdapGroups(server, request, remoteUser, reply, groups);
  } else {
    server.log(['plugin:own-home', 'debug'], 'Found groups: ' + groups.toString());
    reply(generateReply(server, request, remoteUser, groups, function(result) {
      server.log(['plugin:own-home', 'debug'], 'LDAP search status: ' + result.status);
      server.log(['plugin:own-home', 'debug'], 'Found groups: ' + groups.toString());
      reply(generateReply(server, request, remoteUser, groups));
    }));
  }
};
