'use strict';

const Jwt = require('jwt-async');
const Crypto = require('crypto');
const Url = require('url');
const Path = require('path');
const QueryString = require('querystring');
const AccessToken = require('./accesstoken');

const Defaults = {
  userStore: null,
  homePage: 'index.html',
  loginPage: 'login.html',
  logoutPage: 'logout.html',
  groups: ['admin', 'user'],
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

    this.AccessToken = new AccessToken(this.Config.jwt);

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
          return self.AccessToken.generateToken();
        })
        .then(token => {
          if (req.accepts('html')) {
            self.AccessToken.setResponseTokenCookie(res, token);
            self.redirect(req, res, self.Config.homePage);
            return;
          }
          res.json({ token: token });
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
      self.AccessToken.clearResponseTokenCookie(res);
      self.redirect(req, res, self.Config.loginPage);
    });
  }

  // setup secure routes
  secureRoutes (app) {
    let self = this;
    app.use((req, res, next) => {
      let urlParts = Url.parse(req.originalUrl);
      let pathParts = Path.parse(urlParts.path);
      if (self.Config.pathPassRegExp.test(pathParts.dir) || self.Config.loginPageRegExp.test(pathParts.base)) {
        // non-secured route
        next();
        return;
      }
      self.AccessToken.isRequestAuthorized(req)
        .then(authorized => {
          if (authorized) {
            next();
            return;
          }
          if (req.accepts('html')) {
            self.redirect(req, res, self.Config.loginPage);
            return;
          }
          res.json({ error: 'Authorization failure' });
        })
        .catch(error => {
          throw new Error(error.message);
        });
    });
  }

  // redirect to url with query string from queryParams
  redirect (req, res, url, queryParams) {
    res.redirect(302, req.protocol + '://' + req.headers['host'] + '/' + url + (queryParams ? '?' + QueryString.stringify(queryParams) : ''));
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
