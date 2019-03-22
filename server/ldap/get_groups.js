import LdapClient from 'ldapjs-client';
import getLdapConfig from './get_ldap_config';

export default function (server, request, remoteUser) {
  const configPrefix = 'own_home.ldap.';
  const config = server.config();

  const ldapConfig = getLdapConfig(server, remoteUser);

  let groups = []

  const getGroups = async function () {
    const client = new LdapClient({
      url: config.get(configPrefix + 'url')
    });

    if (config.get(configPrefix + 'bind.dn') && config.get(configPrefix + 'bind.password')) {
      try {
        await client.bind(config.get(configPrefix + 'bind.dn'), config.get(configPrefix + 'bind.password'));
      } catch (e) {
        server.log(['plugin:own-home', 'error'], 'LDAP bind error: ' + e);
        return groups;
      }
    }

    if (config.get(configPrefix + 'get_dn_dynamically') && config.get(configPrefix + 'member_attribute') != 'memberUid') {
      const userbase = config.get(configPrefix + 'userbase');
      const usernameAttribute = config.get(configPrefix + 'username_attribute');
      const options = {
        scope: 'sub',
        filter: '(' + usernameAttribute + '=' + remoteUser + ')',
        attributes: ['dn']
      };
      let dn;
      const dnEntries = await client.search(userbase, options);
      try {
        dn = dnEntries[0].dn;
      } catch (e) {
        server.log(['plugin:own-home', 'error'], 'No DN Found');
        return groups;
      }
      server.log(['plugin:own-home', 'debug'], 'Found DN: ' + dn);
      ldapConfig.options['filter'] = ldapConfig.options['filter'].replace('%DN%', dn);
    }

    const entries = await client.search(ldapConfig.rolebase, ldapConfig.options);
    for (let entry of entries) {
        groups.push(entry.cn)
    }
    server.log(['plugin:own-home', 'debug'], 'Found LDAP groups: ' + groups.toString());
    return groups;
  }
  return getGroups();
};
