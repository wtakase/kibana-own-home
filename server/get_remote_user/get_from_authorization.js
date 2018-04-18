export default function (server, request) {
  let authorization = request.headers.authorization;
  if (!authorization) {
    return null;
  }

  let [type, payload] = authorization.split(' ');
  if (type !== 'Basic' || !payload) {
    return null;
  }

  let [username, password] = Buffer.from(payload, 'base64').toString().split(':');

  if (username === server.config().get('elasticsearch.username')) {
    return null;
  }

  return username;
}

