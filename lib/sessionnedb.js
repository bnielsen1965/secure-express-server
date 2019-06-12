'use strict';

const NeDB = require('nedb');
const Path = require('path');

const Defaults = {
  storagePath: './',
  sessionsFile: 'session.db'
};

class SessionNeDB {
  constructor(Config) {
    this.Config = Object.assign({}, Defaults, Config);
    this.db = new NeDB({ filename: Path.join(this.Config.storagePath, this.Config.sessionsFile), autoload: true });
    this.db.ensureIndex({ fieldName: 'token', unique: true });
  }

  getSession (token) {
    return new Promise((resolve, reject) => {
      this.db.find({ token: token }, (error, docs) => {
        if (error) {
          reject(error);
          return;
        }
        if (!docs || !docs.length) {
          reject(new Error('No session found for token'));
          return;
        }
        delete docs[0]._id;
        resolve(docs[0]);
      });
    });
  }

  saveSession (token, username, groups) {
    return new Promise((resolve, reject) => {
      this.db.insert({ token: token, username: username, groups: groups }, (error, session) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(session);
      });
    });
  }

  removeSession (token) {
    return new Promise((resolve, reject) => {
      this.db.remove({ token: token }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(true);
      });
    })
  }

}

module.exports = SessionNeDB;
