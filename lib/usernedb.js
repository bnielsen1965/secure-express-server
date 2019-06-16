'use strict';

const NeDB = require('nedb');
const Path = require('path');

const Defaults = {
  storagePath: './',
  usersFile: 'users.db'
};

class UserNeDB {
  constructor(Config) {
    this.Config = Object.assign({}, Defaults, Config);
    this.db = new NeDB({ filename: Path.join(this.Config.storagePath, this.Config.usersFile), autoload: true });
    this.db.ensureIndex({ fieldName: 'username', unique: true });
  }

  getUserList () {
    return new Promise((resolve, reject) => {
      this.db.find({ }, (error, docs) => {
        resolve(docs);
      });
    });
  }

  getUser (username) {
    return new Promise((resolve, reject) => {
      this.db.find({ username: username }, (error, docs) => {
        resolve(docs && docs.length ? docs[0] : null);
      });
    });
  }

  saveUser (username, password, groups) {
    return new Promise((resolve, reject) => {
      this.db.insert({ username: username, password: password, groups: groups }, (error, user) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(user);
      });
    });
  }

  removeUser (username) {
    return new Promise((resolve, reject) => {
      this.db.remove({ username: username }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(true);
      });
    })
  }

  changePassword (username, password) {
    return new Promise((resolve, reject) => {
      this.db.update({ username: username }, { $set: { password: password } }, (error) =>{
        if (error) {
          reject(error);
          return;
        }
        resolve(true);
      });
    })
  }
}

module.exports = UserNeDB;
