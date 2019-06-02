'use strict';

const ReadLine = require('readline');
const Writable = require('stream').Writable;

class MutePrompt {
  constructor () {
    this.stdout = this.createStdoutInterface();
    this.unmuteStdout();
    this.stdin = this.createStdinInterface(this.stdout);
  }

  // prompt with a question
  question (message, muted) {
    let self = this;
    return new Promise((resolve, reject) => {
      if (muted) {
        this.stdout.write(message); // show prompt message before muting output
        this.muteStdout();
      }
      else {
        this.unmuteStdout();
      }
      this.stdin.question(message, response => {
        if (muted) {
          this.unmuteStdout();
          this.stdout.write('\n'); // add the muted new line
        }
        resolve(response);
      });
    });
  }

  // create the stdin interface for the prompt
  createStdinInterface (stdout) {
    return ReadLine.createInterface({
      input: process.stdin,
      output: stdout,
      terminal: true
    });
  }

  // create the stdout interface for the prompt
  createStdoutInterface () {
    return new Writable({
      write: function (chunk, encoding, callback) {
        if (!this.muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      }
    });
  }

  // mute stdout output
  muteStdout () {
    this.stdout.muted = true;
  }

  // unmute stdout output
  unmuteStdout () {
    this.stdout.muted = false;
  }

}

module.exports = MutePrompt;
