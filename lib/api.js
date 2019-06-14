'use strict';

const SpawnSync = require('child_process').spawnSync;

const Defaults = {
  path: '/api'
};

class Api {
  constructor (Config) {
    this.Config = Object.assign({}, Defaults, Config);
    if (!this.Config.authentication) {
      throw new Error('API requires an authentication module');
    }

    // methods that need to be bound to this instance
    this.changePassword = this._changePassword.bind(this);
  }

  openRoutes (app) {
    app.get(this.Config.path + '/ping', (req, res, next) => {
      res.json({ pong: new Date().toISOString() });
    });

    app.post(this.Config.path + '/auth', this.Config.authentication.processLogin);
  }

  secureRoutes (app) {
    app.get(this.Config.path + '/getsession', this.getSession);
    app.post(this.Config.path + '/changepassword', this.changePassword);
    app.get(this.Config.path + '/logout', this.Config.authentication.processLogout);
  }

  getSession (req, res, next) {
    res.json(req.session);
  }

  _changePassword (req, res, next) {
    let username = req.session.username;
    this.Config.authentication.authenticate(username, req.body.oldPassword)
      .then(record => {
        return this.Config.authentication.changePassword(username, req.body.newPassword);
      })
      .then(() => {
        res.json({ message: 'Password changed' });
      })
      .catch(error => {
        res.json({ error: error.message });
      });
  }
}

module.exports = Api;
