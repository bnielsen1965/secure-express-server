$(document).ready(function () {
  $('button#changepassword').on('click', changePassword);
  apiCall('GET', 'getsession', null, function (response) {
    console.log(response)
  });
});


function changePassword () {
  clearAll();
  if ($('#newpassword').val() !== $('#confirmpassword').val()) {
    return showErrors(['New password and confirm password do not match']);
  }
  apiCall('POST', 'changepassword', { oldPassword: $('#oldpassword').val(), newPassword: $('#newpassword').val() }, function (response) {
//    showMessages([JSON.stringify(response)])
  });
}
