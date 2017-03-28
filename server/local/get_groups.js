export default function (server) {
  return server.config().get('own_home.local.groups');
}
