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

    app.get(this.Config.path + '/reboot', (req, res, next) => {
      let self = this;
      setTimeout(function () { self.sudoScript('shutdown', ['-r', 'now']); }, 2000);
      res.json({ message: 'Reboot now' });
    });
  }

  sudoScript (script, args) {
    SpawnSync('sudo', [script, '-r', 'now']);
  }
}

module.exports = Api;
