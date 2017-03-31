import url from 'url';
import _ from 'lodash';
const readFile = (file) => require('fs').readFileSync(file, 'utf8');
import http from 'http';
import https from 'https';

module.exports = _.memoize(function (server) {
  const config = server.config();

  const target = url.parse(server.info.uri);

  if (!/^https/.test(target.protocol)) return new http.Agent();

  const agentOptions = {
    rejectUnauthorized: config.get('own_home.explicit_kibana_index_url.kibana.ssl.verificationMode')
  };

  if (_.size(config.get('own_home.explicit_kibana_index_url.kibana.ssl.certificateAuthorities'))) {
    agentOptions.ca = config.get('own_home.explicit_kibana_index_url.kibana.ssl.certificateAuthorities').map(readFile);
  }

  return new https.Agent(agentOptions);
});

// See https://lodash.com/docs#memoize: We use a Map() instead of the default, because we want the keys in the cache
// to be the server objects, and by default these would be coerced to strings as keys (which wouldn't be useful)
module.exports.cache = new Map();
