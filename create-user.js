'use strict';

const Config = require('./config');
const UserNeDB = require('./lib/usernedb');
const Authentication = require('./lib/authentication');
const Path = require('path');
const MutePrompt = require('mute-prompt');

let userNeDB = new UserNeDB({ storagePath: Path.join(__dirname, Config.storageDirectory) });
let authentication = new Authentication({ userStore: userNeDB });
let prompt = new MutePrompt();
let newUser;

console.log('Create new user...');
getCredentials()
  .then(response => {
    newUser = response;
    return createUser(newUser);
  })
  .then(() => {
    console.log('Created user ' + newUser.username);
    process.exit(0);
  })
  .catch((error) => {
    console.log(error.stack);
    process.exit(1);
  });

async function getCredentials() {
  let username = await prompt.question('Username: ');
  let password = await prompt.question('Password: ', true);
  let group = await prompt.question('Group (' + Config.authentication.groups.join(', ') + '): ');
  if (-1 === Config.authentication.groups.indexOf(group)) {
    throw new Error('Invalid group name');
  }
  return { username: username, password: password, groups: [group] };
}

async function createUser(newUser) {
  let user = await userNeDB.getUser(newUser.username);
  if (user) {
    throw new Error('User already exists');
  }
  if (! await userNeDB.saveUser(newUser.username, authentication.hashPassword(newUser.password), newUser.groups)) {
    throw new Error('Save user failed');
  }
}
