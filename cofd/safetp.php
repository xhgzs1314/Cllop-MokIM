<?php
require('blacklist.php');
$ip = $_SERVER['REMOTE_ADDR'];
if (in_array($ip, $blacklist)) {
  echo "<script>location = '/ban.php';</script>";
  } 
if (isset($_COOKIE['user_key'])) {
  $currentUser = $_COOKIE['user_key'];
}else{
  $currentUser = '1';
}
echo "<script>var serverUserKey = '" . $currentUser . "';</script>";
?>
<script>
    var sessionStorageUser = sessionStorage.getItem('user');
    if (sessionStorageUser === null || sessionStorageUser === '' || sessionStorageUser !== serverUserKey) {
location = '/ban.php';
    }
</script>