'use strict';

const Crypto = require('crypto');
const Url = require('url');
const Path = require('path');
const QueryString = require('querystring');
const AccessToken = require('./accesstoken');

const Defaults = {
  userStore: null,
  sessionStore: null,
  homePage: 'index.html',
  loginPage: 'login.html',
  logoutPage: 'logout.html',
  groups: ['admin', 'user'],
  noAuthenticationPaths: ['/'],
  jwt: {
    secret: 'replace with custom secret',
    expireMinutes: 10,
    notBeforeMinutes: 1,
    renewBeforeExpireSeconds: 240
  },
  hashConfig: {
    algorithm: 'sha512',
    saltLength: 16
  }
};

class Authentication {
  constructor (Config) {
    let jwtConfig = Object.assign({}, Defaults.jwt, Config.jwt);
    let hashConfig = Object.assign({}, Defaults.hashConfig, Config.hashConfig);
    this.Config = Object.assign({}, Defaults, Config, { jwt: jwtConfig }, { hashConfig: hashConfig });
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
        return this.Config.sessionStore.saveSession(token, user.username, user.groups);
      })
      .then(session => {
        if (req.accepts('html')) {
          this.AccessToken.setResponseTokenCookie(res, session.token);
          return this.redirect(req, res, this.Config.homePage);
        }
        res.json(Object.assign({}, user, { token: session.token }));
      })
      .catch(error => {
        this.redirectToLogin(req, res, { username: req.body.username, error: error.message });
      });
  }

  // setup route for logout
  logoutRoute (app) {
    app.use('/' + this.Config.logoutPage, this.processLogout);
  }

  // process logout request
  _processLogout (req, res, next) {
    let token = this.AccessToken.getAccessTokenFromRequest(req);
    this.AccessToken.clearResponseTokenCookie(res);
    this.Config.sessionStore.removeSession(token)
      .then(() => {
        this.redirectToLogin(req, res);
      })
      .catch(error => {
        this.redirectToLogin(req, res, { error: error.message });
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
      self.validateRoute(req, res, next);
    });
  }

  // validate user access to route
  async validateRoute (req, res, next) {
    let auth = await this.AccessToken.isRequestAuthorized(req);
    if (!auth) {
      return this.redirectToLogin(req, res);
    }
    let session;
    try {
      session = await this.Config.sessionStore.getSession(auth.accessToken);
      if (!session) {
        throw new Error('No session for token');
      }
    }
    catch (error) {
      return this.redirectToLogin(req, res, { error: error.message });
    }
    req.session = session;
    next();
  }

  // redirect to login page or respond with params if not accepting html
  redirectToLogin (req, res, params) {
    if (req.accepts('html')) {
      this.redirect(req, res, this.Config.loginPage, params);
      return;
    }
    res.json(params);
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

  // change user password
  async changePassword (username, password) {
    await this.Config.userStore.changePassword(username, this.hashPassword(password));
  }

  // save a new user
  async saveUser (username, password, groups) {
    let user = await this.Config.userStore.getUser(username);
    if (user) {
      throw new Error('Username ' + username + ' already exists');
    }
    let success = await this.Config.userStore.saveUser(username, this.hashPassword(password), groups);
    if (!success) {
      throw new Error('Failed to save new user');
    }
    return true;
  }

  // get user list from data store
  async getUserList () {
    return await this.Config.userStore.getUserList();
  }

  // delete user from data store
  async deleteUser (username) {
    if (!username) {
      throw new Error('No username specified');
    }
    return await this.Config.userStore.removeUser(username);
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
