'use strict';

const Jwt = require('jwt-async');

const Defaults = {
  secret: 'replace with custom secret',
  algorithm: 'HS512',
  expireMinutes: 10,
  renewBeforeExpireSeconds: 240,
  validJitterSeconds: 60
};

class AccessToken {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
    this.jwt = new Jwt({
      crypto: { secret: this.Config.secret, algorithm: this.Config.algorithm },
      validations: { exp: true, nbf: true },
      claims: {
        iat: true,
        nbf: Math.floor(Date.now() / 1000) - this.Config.validJitterSeconds,
        exp: Math.floor(Date.now() / 1000) + (this.Config.expireMinutes * this.Config.validJitterSeconds)
      }
    });
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
  verifyToken (token) {
    return new Promise((resolve, reject) => {
      this.jwt.verify(token, (err, data) => {
        if (!data) {
          resolve(false);
          return;
        }
        resolve(token);
      });
    });
  }

  // generate a new token
  generateToken () {
    return new Promise((resolve, reject) => {
      this.jwt.sign({}, (err, data) => {
        resolve(data);
      });
    });
  }
}

module.exports = AccessToken;
