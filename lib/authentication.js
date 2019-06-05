'use strict';

const Jwt = require('jwt-async');
const Crypto = require('crypto');
const Url = require('url');
const Path = require('path');
const QueryString = require('querystring');

const Defaults = {
  userStore: null,
  homePage: 'index.html',
  loginPage: 'login.html',
  logoutPage: 'logout.html',
  noAuthenticationPaths: ['/'],
  jwt: {
    secret: 'replace with custom secret',
    expireMinutes: 10,
    renewBeforeExpireSeconds: 240
  },
  hashConfig: {
    algorithm: 'sha512',
    saltLength: 16
  }
};

class Authentication {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
    this.Config.pathPassRegExp = new RegExp('^(' + this.Config.noAuthenticationPaths.join('|') + ')', 'i');
    this.Config.loginPageRegExp = new RegExp('^' + this.Config.loginPage.replace('.', '\\.') + '(\\?|$)');
    this.INVALID_USER = 1;
    this.AUTHENTICATION_FAILED = 2;

    this.authenticationRoutes = this._authenticationRoutes.bind(this);
  }

  // configure authentication routes
  _authenticationRoutes (app) {
    this.loginRoute(app);
    this.logoutRoute(app);
    this.secureRoutes(app);
  }

  // setup route for login
  loginRoute (app) {
    let self = this;
    app.post('/' + self.Config.loginPage, (req, res, next) => {
      self.authenticate(req.body.username, req.body.password)
        .then(record => {
          return self.generateToken();
        })
        .then(token => {
          self.setResponseTokenCookie(res, token);
          self.redirect(req, res, self.Config.homePage);
        })
        .catch(error => {
          self.redirect(req, res, self.Config.loginPage, { username: req.body.username, error: error.message });
        });
    });
  }

  // setup route for logout
  logoutRoute (app) {
    let self = this;
    app.use('/' + self.Config.logoutPage, (req, res, next) => {
      self.clearResponseTokenCookie(res);
      self.redirect(req, res, self.Config.loginPage);
    });
  }

  // setup secure routes
  secureRoutes (app) {
    let self = this;
    app.use((req, res, next) => {
      let urlParts = Url.parse(req.originalUrl);
      let pathParts = Path.parse(urlParts.path);
      // check if it is a non-secure route
      if (self.Config.pathPassRegExp.test(pathParts.dir) || self.Config.loginPageRegExp.test(pathParts.base)) {
        next();
        return;
      }
      self.isRequestAuthorized(req)
        .then(authorized => {
          if (authorized) {
            next();
            return;
          }
          self.redirect(req, res, self.Config.loginPage);
        })
        .catch(error => {
          throw new Error(error.message);
        });
    });
  }

  // redirect to login
  redirect (req, res, url, queryParams) {
    res.redirect(302, req.protocol + '://' + req.headers['host'] + '/' + url + (queryParams ? '?' + QueryString.stringify(queryParams) : ''));
  }

  // verify an access token in a request
  isRequestAuthorized (req) {
    return new Promise((resolve, reject) => {
      let accessToken = this.getAccessTokenFromRequest(req);
      if (!accessToken) {
        resolve(false);
        return;
      }

      let jwt = new Jwt({
        crypto: { secret: this.Config.jwt.secret },
        validations: { exp: true, nbf: true }
      });

      jwt.verify(accessToken, (err, data) => {
        if (!data) {
          resolve(false);
          return;
        }
        resolve(accessToken);
      });
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


  // generate an authentication token
  generateToken () {
    return new Promise((resolve, reject) => {
      let jwtOptions = {
        crypto: { secret: this.Config.jwt.secret },
        claims: {
          iat: true,
          nbf: Math.floor(Date.now() / 1000) - 60,
          exp: Math.floor(Date.now() / 1000) + (this.Config.jwt.expireMinutes * 60)
        }
      };

      let jwt = new Jwt(jwtOptions);
      jwt.sign({}, (err, data) => {
        resolve(data);
      });
    });
  }

  // set access token in browser cookie
  setResponseTokenCookie (res, token) {
    res.cookie('accessToken' , token, { maxAge: (this.Config.jwt.expireMinutes + 5) * 60 * 1000 });
  }

  // clear access token in response
  clearResponseTokenCookie (res) {
    res.clearCookie('accessToken');
  }

  // authenticate against local users in config
  async authenticate (username, password) {
    let record = await this.Config.userStore.getUser(username);
    if (!record) {
      throw Object.assign(new Error('Invalid username'), { code: this.INVALID_USER });
    }
    if (this.hashPassword(password, record.password) !== record.password) {
      throw Object.assign(new Error('Authentication failed'), { code: this.AUTHENTICATION_FAILED });
    }
    return record; // TODO remove password?
  }

  // create password hash with random salt or provided salt from previous hash
  hashPassword (password, salt) {
    salt = (salt ? salt.split('$')[0] : this.getRandomString(this.Config.hashConfig.saltLength));
    let hash = Crypto.createHmac(this.Config.hashConfig.algorithm, salt);
    hash.update(password);
    return salt + '$' + hash.digest('hex');
  }

  // create a random string
  getRandomString (length) {
    return Crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }
}

module.exports = Authentication;
