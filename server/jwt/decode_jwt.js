import decode from 'jsonwebtoken/decode';

export default function (token) {
  return decode(token);
}
