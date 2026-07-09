<?php
$dbHost = $_POST['dbHost'];
$dbName = $_POST['dbName'];
$dbUsername = $_POST['dbUsername'];
$dbPassword = $_POST['dbPassword'];
$adminadress = $_POST['adminadress'];
$conn = new mysqli($dbHost, $dbUsername, $dbPassword, $dbName);
if ($conn->connect_error) {
    die("连接失败: " . $conn->connect_error);
}
$sqlFilePath = "inl.sql";
if (($handle = fopen($sqlFilePath, "r")) === FALSE) {
    die("无法打开 SQL 文件: " . $sqlFilePath);
}
$currentStatement = '';
while (($line = fgets($handle)) !== FALSE) {
    $line = trim($line);
    if (preg_match('/^\s*(--|#)/', $line)) {
        continue;
    }
    $currentStatement .= $line . " ";
    if (preg_match('/;\s*$/', $currentStatement)) {
        $currentStatement = trim($currentStatement, " \t\n\r\0\x0B;");
        if (!$conn->query($currentStatement)) {
            echo "执行失败: " . $conn->error . "\n";
            echo "失败的 SQL 语句: " . $currentStatement . "\n";
        }
        $currentStatement = '';
    }
}
if (!empty($currentStatement)) {
    echo "警告：文件末尾存在未完成的 SQL 语句。\n";
    echo "未完成的 SQL 语句: " . $currentStatement . "\n";
}
fclose($handle);
require '../config.php';
$linkf = '../config.php';
$ncc = "  
<?php
\$db_host = '$dbHost';    
\$db_user = '$dbUsername';    
\$db_pass = '$dbPassword';    
\$db_name = '$dbName';    
?>";
file_put_contents($linkf, $ncc);
if ($adminadress != 'mokim-admin') {
    rename($_SERVER['DOCUMENT_ROOT'] . '/mokim-admin', $_SERVER['DOCUMENT_ROOT'] . '/' . $adminadress);
}
echo "success";
$conn->close();
