import axios from 'axios';

export default function (server, token, callback, callbackErr) {
  const url = server.config().get('own_home.jwt.verifyurl');

  function verifyJwt(token) {
    axios({
      url: url,
      headers: {
        'Authorization': 'Bearer ' + token
      }
    })
      .then(function (response) {
        server.log(['plugin:own-home', 'debug'], 'Jwt token verified');
        callback();
      })
      .catch(function (error) {
        server.log(['plugin:own-home', 'error'], 'Jwt verification failure', error);
        callbackErr(error);
      });
  }

  verifyJwt(token);
}
