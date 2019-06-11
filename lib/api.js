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
  }

  openRoutes (app) {
    app.get(this.Config.path + '/ping', (req, res, next) => {
      res.json({ pong: new Date().toISOString() });
    });

    app.post(this.Config.path + '/auth', this.Config.authentication.processLogin);
  }

  secureRoutes (app) {
    app.get(this.Config.path + '/logout', this.Config.authentication.processLogout);
  }
}

module.exports = Api;
