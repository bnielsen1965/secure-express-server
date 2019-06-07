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

    // ensure some methods are bound to this instance
    this.authenticationRoutes = this._authenticationRoutes.bind(this);
    this.processLogin = this._processLogin.bind(this);
    this.processLogout = this._processLogout.bind(this);
  }

  // configure authentication routes
  _authenticationRoutes (app) {
    this.loginRoute(app);
    this.logoutRoute(app);
    this.secureRoutes(app);
  }

  // setup route for login
  loginRoute (app) {
    app.post('/' + this.Config.loginPage, this.processLogin);
  }

  // process a login request
  _processLogin (req, res, next) {
    let user;
    this.authenticate(req.body.username, req.body.password)
      .then(record => {
        user = record;
        return this.AccessToken.generateToken();
      })
      .then(token => {
        if (req.accepts('html')) {
          this.AccessToken.setResponseTokenCookie(res, token);
          this.redirect(req, res, this.Config.homePage);
          return;
        }
        res.json(Object.assign({}, user, { token: token }));
      })
      .catch(error => {
        if (req.accepts('html')) {
          this.redirect(req, res, this.Config.loginPage, { username: req.body.username, error: error.message });
          return;
        }
        res.json({ error: error.message });
      });
  }

  // setup route for logout
  logoutRoute (app) {
    app.use('/' + this.Config.logoutPage, this.processLogout);
  }

  // process logout request
  _processLogout (req, res, next) {
    this.AccessToken.clearResponseTokenCookie(res);
    if (req.accepts('html')) {
      this.redirect(req, res, this.Config.loginPage);
      return;
    }
    res.json({ message: 'Authentication ended' }); // NOTE token will still be valid, need sessions
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
    delete record.password;
    delete record._id;
    return record;
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
