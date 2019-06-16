$(document).ready(function () {
  apiCall('GET', 'getsession', null, function (response) {
    if (response.groups && response.groups.includes('admin')) {
      showSecured(response.groups);
      getUserList();
    }
  });

  $('button#changepassword').on('click', changePassword);
  $('#adduser').click(addUser);
});


function changePassword () {
  clearAll();
  if ($('#newpassword').val() !== $('#confirmpassword').val()) {
    return showErrors(['Password and confirm password do not match']);
  }
  apiCall('POST', 'changepassword', { oldPassword: $('#oldpassword').val(), newPassword: $('#newpassword').val() }, function (response) {
    if (response.success) {
      clearChangePassword();
    }
  });
}

function clearChangePassword () {
  $('#newpassword, #confirmpassword, #oldpassword').val('');
}


function addUser () {
  clearAll();
  if ($('#addpassword').val() !== $('#addconfirmpassword').val()) {
    return showErrors(['Password and confirm password do not match']);
  }
  let newUser = {
    username: $('#addusername').val(),
    password: $('#addpassword').val(),
    groups: [$('#addgroup').val()]
  };
  apiCall('POST', 'adduser', newUser, function (response) {
    if (response.success) {
      clearAddUser();
      getUserList();
    }
  });
}

function clearAddUser () {
  $('#addusername, #addpassword, #addconfirmpassword').val('');
}


function getUserList () {
  clearAll();
  apiCall('GET', 'getuserlist', null, function (response) {
    if (response.userList) {
      showUserList(response.userList);
    }
  });
}

function showUserList (list) {
  $('#userlist').html('');
  let table = $('<table>');
  $(table).append('<tr><th>Username</th><th>Group</th><th></th></tr>');
  list.forEach(function (item, i) {
    let functions = '<a href="#" onclick="deleteUser(event, ' + i + ')">[Delete]</a>';
    $(table).append('<tr><td class="username">' + item.username + '</td><td>' + item.groups.join(', ') + '</td><td>' + functions + '</td></tr>');
  });
  $('#userlist').append(table);
}

function deleteUser(e, i) {
  clearAll();
  e.preventDefault();
  let username = $('#userlist tr:nth-child(' + (i + 2) + ')').find('.username').html();
  if (window.confirm('Delete user ' + username + '?')) {
    apiCall('POST', 'deleteuser', { username: username }, function (response) {
      if (response.success) {
        getUserList();
      }
    });
  }
}
