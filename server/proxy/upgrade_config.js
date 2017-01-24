import Promise from 'bluebird';
import fs from 'fs';

import isUpgradeable from '../../../../src/plugins/elasticsearch/lib/is_upgradeable';
import _ from 'lodash';
import { format } from 'util';
import createClient from './create_client';

module.exports = function (server, index, ignore) {
  const MAX_INTEGER = Math.pow(2, 53) - 1;

  const client = createClient(server);
  const config = server.config();

  function createNewConfig() {
    return client.create({
      index: index,
      type: 'config',
      body: { buildNum: config.get('pkg.buildNum') },
      id: config.get('pkg.version'),
      ignore: ignore || []
    }).then(function(response) {
      if (config.get('own_home.default_index') && config.get('own_home.default_objects_json')) {
        return client.search({ index: index, q: 'defaultIndex:*' }).then(function (response) {
          // NOTE(wtakase): Set defaultIndex and objects only if defaultIndex has not been set yet.
          // TODO(wtakase): Even if this plugin set defaultIndex, Kibana says 'No default index pattern'.
          if (response.hits.hits.length === 0) {
            client.update({
              index: index,
              type: 'config',
              id: config.get('pkg.version'),
              body: { doc: { defaultIndex: config.get('own_home.default_index') } }
            }).then(function () {
              try {
                const obj = JSON.parse(fs.readFileSync(config.get('own_home.default_objects_json')));
                let body = [];
                for (let i = 0; i < obj.length; i++) {
                  body.push({ index: { _index: index, _type: obj[i]['_type'], _id: obj[i]['_id'] } });
                  body.push(obj[i]['_source']);
                }
                server.log(['plugin:own-home', 'debug'], 'Import default objects from ' + config.get('own_home.default_objects_json'));
                return client.bulk({ body: body, ignore: ignore || [] });
              } catch (err) {
                server.log(['plugin:own-home', 'error'], err);
              }
            });
          }
        });
      }
    });
  }

  return function (response) {
    const newConfig = {};

    // Check to see if there are any doc. If not then we set the build number and id
    if (response.hits.hits.length === 0) {
      return createNewConfig();
    }

    // if we already have a the current version in the index then we need to stop
    const devConfig = _.find(response.hits.hits, function currentVersion(hit) {
      return hit._id !== '@@version' && hit._id === config.get('pkg.version');
    });

    if (devConfig) return Promise.resolve();

    // Look for upgradeable configs. If none of them are upgradeable
    // then create a new one.
    const body = _.find(response.hits.hits, isUpgradeable.bind(null, server));
    if (!body) {
      return createNewConfig();
    }

    // if the build number is still the template string (which it wil be in development)
    // then we need to set it to the max interger. Otherwise we will set it to the build num
    body._source.buildNum = config.get('pkg.buildNum');

    server.log(['plugin', 'elasticsearch'], {
      tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion: body._id,
      newVersion: config.get('pkg.version')
    });

    return client.create({
      index: index,
      type: 'config',
      body: body._source,
      id: config.get('pkg.version')
    });
  };
};
