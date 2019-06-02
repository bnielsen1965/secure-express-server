# mute-prompt

A utility used to generate command line prompts that have the keyboard input muted.

In some cases a user prompt at the command line should mute the output from the
keyboard to protect user input, i.e. when entering a password. This module is used
to generate a command line prompt question that can be muted to hide user input.


# install

> npm --save install mute-prompt


# usage

The module is used in terminal applications and imports as a class which requires
creating an instance with the new command. There is a single primary method provided
by the instance that is used to prompt the user with a question.


## question (prompt, [muted])

The question method returns a promise that resolves with the user input. The question
method accepts two parameters, a string for the question prompt and an optional boolean
to enable the muted output mode.

When calling the question method without a muted parameter the muted value defaults to
false and user input will be visible as they enter their answer at the prompt.
```javascript
// ask question without muted output
prompt.question("Username: ")
  .then((answer) => {
    console.log('User answered ' + answer);
  })
```

When asking a user question with a sensitive answer the muted parameter should be
set to true and the user input will not be visible as they enter their answer.
```javascript
// ask question with muted output to protect answer
prompt.question("Password: ", true)
  .then((answer) => {
    console.log('User answered ' + answer);
  })
```


## example

```javascript
const MutePrompt = require('mute-prompt');
let prompt = new MutePrompt();

let username, password;

// ask for username without muting output
prompt.question("Username: ")
  .then((answer) => {
    username = answer;
    // ask for password with output muted
    return prompt.question("Password: ", true);
  })
  .then((answer) => {
    password = answer;
    console.log('Username/Password: ', username + '/' + password);
    process.exit(0);
  })
  .catch((error) => {
    console.log(error.stack);
    process.exit(1);
  });
```
