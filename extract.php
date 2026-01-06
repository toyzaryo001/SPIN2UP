<?php
// PHP script to extract ZIP file using ZipArchive
error_reporting(E_ALL);
ini_set('display_errors', 1);

$zipFile = 'player.zip';
$extractTo = './';

echo "<h2>Extract ZIP File</h2>";

if (!file_exists($zipFile)) {
    die("❌ File '$zipFile' not found!");
}

$zip = new ZipArchive;
$result = $zip->open($zipFile);

if ($result === TRUE) {
    $zip->extractTo($extractTo);
    $zip->close();

    // Delete the ZIP file after extraction
    unlink($zipFile);

    echo "✅ Extract successful!<br>";
    echo "✅ Deleted $zipFile<br>";
    echo "<br><a href='./'>View files</a>";
} else {
    echo "❌ Failed to extract. Error code: $result<br>";
    echo "Make sure the file is a valid ZIP file.";
}
?>