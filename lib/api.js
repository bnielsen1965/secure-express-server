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
    this.addUser = this._addUser.bind(this);
    this.getUserList = this._getUserList.bind(this);
    this.deleteUser = this._deleteUser.bind(this);
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
    app.post(this.Config.path + '/adduser', this.addUser);
    app.get(this.Config.path + '/getuserlist', this.getUserList);
    app.post(this.Config.path + '/deleteuser', this.deleteUser);
    app.get(this.Config.path + '/logout', this.Config.authentication.processLogout);
  }

  getSession (req, res, next) {
    res.json(req.session);
  }

  userInGroup (req, group) {
    if (!req.session || !req.session.groups || !req.session.groups.includes(group)) {
      return false;
    }
    return true;
  }

  _changePassword (req, res, next) {
    let username = req.session.username;
    this.Config.authentication.authenticate(username, req.body.oldPassword)
      .then(record => {
        return this.Config.authentication.changePassword(username, req.body.newPassword);
      })
      .then(() => {
        res.json({ success: true, message: 'Password changed' });
      })
      .catch(error => {
        res.json({ success: false, error: error.message });
      });
  }

  _addUser (req, res, next) {
    if (!this.userInGroup(req, 'admin')) {
      return res.json({ success: false, error: 'Not authorized' });
    }
    this.Config.authentication.saveUser(req.body.username, req.body.password, req.body.groups)
      .then (success => {
        if (!success) {
          throw new Error('Failed to save new user');
        }
        res.json({ success: true, message: 'Saved user ' + req.body.username });
      })
      .catch(error => {
        res.json({ success: false, error: error.message });
      });
  }

  _getUserList (req, res, next) {
    if (!this.userInGroup(req, 'admin')) {
      return res.json({ success: false, error: 'Not authorized' });
    }
    this.Config.authentication.getUserList()
      .then (userList => {
        res.json({ success: true, userList: userList });
      })
      .catch(error => {
        res.json({ success: false, error: error.message });
      });
  }

  _deleteUser (req, res, next) {
    this.Config.authentication.deleteUser(req.body.username)
      .then(success => {
        res.json({ success: success });
      })
      .catch(error => {
        res.json({ success: false, error: error.message });
      });
  }

}

module.exports = Api;
