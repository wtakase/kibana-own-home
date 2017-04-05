export default function (server, request) {
  const headerKey = server.config().get('own_home.proxy_user_header');
  if (headerKey in request.headers) {
    return request.headers[headerKey];
  } else {
    return null;
  }
}
