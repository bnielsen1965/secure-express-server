
(function(window, document, undefined) {
window.onload = function () {
  var username = getQueryVariable('username');
  if (username) {
    document.getElementById('username').value = username;
  }
  var error = getQueryVariable('error');
  if (error) {
    document.getElementById('error').innerHTML = error;
  }
}
})(window, document, undefined);

function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  return null;
}
