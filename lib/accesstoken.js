'use strict';

const JWT = require('jsonwebtoken');

const Defaults = {
  secret: 'replace with custom secret',
  algorithm: 'HS512',
  expireMinutes: 10,
  notBeforeMinutes: 1,
  renewBeforeExpireSeconds: 240,
  validJitterSeconds: 60
};

class AccessToken {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
  }

  // extract the access token from a request object
  getAccessTokenFromRequest (req) {
    // check for token in cookie
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken;
    }

    // check for token in authorization header
    let authorization = req.get('authorization');
    if (authorization) {
      // check for typed token
      let match = /([^\s]+)\s+([^\s]+)/.exec(authorization);
      if (match && /bearer/i.test(match[1])) {
        return match[2]; // return bearer token
      }
      return match ? null : authorization; // if typed token then not a supported type, else it is non-typed token
    }

    // check for token in request url query parameters
    if (req.url) {
      let match = /\?([^&]*&)?accessToken=([^&]*)/.exec(req.url)
      if (match && match[2]) {
        return match[2];
      }
    }

    return null;
  }

  // set access token in browser cookie
  setResponseTokenCookie (res, token) {
    res.cookie('accessToken' , token, { path: '/', maxAge: (this.Config.expireMinutes + 5) * 60 * 1000 });
  }

  // clear access token in response
  clearResponseTokenCookie (res) {
    res.clearCookie('accessToken', { path: '/' });
  }

  // verify an access token in a request
  async isRequestAuthorized (req) {
    let token = this.getAccessTokenFromRequest(req);
    if (!token) {
      return false;
    }
    return await this.verifyToken(token);
  }

  // verify if token is valid
  async verifyToken (token) {
    let payload;
    payload = JWT.verify(token, this.Config.secret);
    if (payload) {
      return { payload: payload, accessToken: token };
    }
    return false;
  }

  // generate a new token
  async generateToken () {
    let token = JWT.sign({}, this.Config.secret, {
      algorithm: this.Config.algorithm,
      expiresIn: (this.Config.expireMinutes * 60 + this.Config.validJitterSeconds) + 's',
      notBefore: '-' + (this.Config.notBeforeMinutes * 60 + this.Config.validJitterSeconds) + 's'
    });
    return token;
  }
}

module.exports = AccessToken;
