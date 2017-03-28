export default function (config, request) {
  if (config.get('own_home.proxy_user_header') in request.headers) {
    return request.headers[config.get('own_home.proxy_user_header')]; 
  } else {
    return null;
  }
};
