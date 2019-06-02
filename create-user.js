'use strict';

const Config = require('./config');
const UserNeDB = require('./lib/usernedb');
const Authentication = require('./lib/authentication');
const Path = require('path');
const MutePrompt = require('mute-prompt');

let userNeDB = new UserNeDB({ storagePath: Path.join(__dirname, Config.storageDirectory) });
let authentication = new Authentication({ userStore: userNeDB });
let prompt = new MutePrompt();

getCredentials()
  .then(credentials => {
    return createUser(credentials.username, credentials.password);
  })
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.log(error.stack);
    process.exit(1);
  });

async function getCredentials() {
  let username = await prompt.question('Username: ');
  let password = await prompt.question('Password: ', true);
  return { username: username, password: password };
}

async function createUser(username, password) {
  let user = await userNeDB.getUser(username);
  if (user) {
    throw new Error('User already exists');
  }
  if (! await userNeDB.saveUser(username, authentication.hashPassword(password))) {
    throw new Error('Save user failed');
  }
}
