<?php
echo "<script>";
echo "var value = sessionStorage.getItem('users');";
echo "if (value === null || value === '') {";
echo "    alert('未登录！');";
echo "    location = '../admin/login.php';";
echo "}";
echo "</script>";
	 ?>