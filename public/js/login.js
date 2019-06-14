
(function(window, document, undefined) {
window.onload = function () {
  var username = getQueryVariable('username');
  if (username) {
    document.getElementById('username').value = username;
  }
  var error = getQueryVariable('error');
  if (error) {
    showErrors([error]);
  }
}
})(window, document, undefined);
