
function showErrors (errors) {
  errors.forEach(function (error) {
    $('#errors').append(error + '<br>');
  });
}

function clearErrors () {
  $('#errors').html('');
}

function showMessages (messages) {
  messages.forEach(function (message) {
    $('#messages').append(message + '<br>');
  });
}

function clearMessages () {
  $('#messages').html('');
}

function clearAll () {
  clearMessages();
  clearErrors();
}

function apiCall (method, path, data, callback) {
  $.ajax({
    url: 'api/' + path,
    dataType: 'json',
    type: method,
    contentType: 'application/json',
    data: (data ? JSON.stringify(data) : null),
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    success: function(response, textStatus, jQxhr) {
      if (response) {
        if (response.error) {
          showErrors([response.error]);
        }
        if (response.message) {
          showMessages([response.message]);
        }
      }
      if (callback) {
        callback(response);
      }
    },
    error: function(jqXhr, textStatus, errorThrown) {
      showErrors([errorThrown]);
    }
  });
}

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
