<?php
require('cofd/functions.php');
setcookie(generateAutoWebsiteIdentifier((true)) . "_log", "", time() - 3600, "/");
header("Location: chat.php");