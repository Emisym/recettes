<?php
// API "Recettes" pour XAMPP (PHP 7.4+). Recettes : data/recipes.json — Prix : data/prices.json — Photos : uploads/
header('Cache-Control: no-store');
$dataDir = __DIR__ . '/data'; $upDir = __DIR__ . '/uploads'; $dbFile = $dataDir . '/recipes.json';
$col = (isset($_GET['col']) && $_GET['col'] === 'prices') ? 'prices' : 'recipes';
$dbFile = $dataDir . '/' . $col . '.json';   // recipes.json ou prices.json
foreach ([$dataDir, $upDir] as $d) { if (!is_dir($d)) @mkdir($d, 0775, true); }
if (!file_exists($dataDir . '/.htaccess')) @file_put_contents($dataDir . '/.htaccess', "Require all denied\n");

function out($code, $data) {
  http_response_code($code); header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE); exit;
}
function with_db($dbFile, $write, $fn) {
  $f = @fopen($dbFile, 'c+');
  if (!$f) out(500, ['error' => 'ecriture impossible : verifiez les droits du dossier data']);
  flock($f, $write ? LOCK_EX : LOCK_SH);
  $raw = stream_get_contents($f);
  $db = json_decode($raw ? $raw : '[]', true);
  if (!is_array($db)) $db = [];
  $res = $fn($db);
  if ($write) { ftruncate($f, 0); rewind($f); fwrite($f, json_encode($db, JSON_UNESCAPED_UNICODE)); fflush($f); }
  flock($f, LOCK_UN); fclose($f);
  return $res;
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : '';
$post = $_SERVER['REQUEST_METHOD'] === 'POST';
$validId = preg_match('/^[\w-]{1,64}$/', $id);

if ($action === 'list') {
  out(200, with_db($dbFile, false, function (&$db) { return array_values($db); }));
}
if ($action === 'save' && $post && $validId) {
  $r = json_decode(file_get_contents('php://input'), true);
  if (!is_array($r)) out(400, ['error' => 'invalide']);
  $r['id'] = $id;
  with_db($dbFile, true, function (&$db) use ($r, $id) {
    foreach ($db as $i => $x) { if (isset($x['id']) && $x['id'] === $id) { $db[$i] = $r; return; } }
    $db[] = $r;
  });
  out(200, ['ok' => 1]);
}
if ($action === 'delete' && $post && $validId) {
  $img = with_db($dbFile, true, function (&$db) use ($id) {
    $img = ''; $new = [];
    foreach ($db as $x) { if (isset($x['id']) && $x['id'] === $id) { $img = isset($x['img']) ? $x['img'] : ''; } else { $new[] = $x; } }
    $db = $new;
    foreach ($new as $x) { if (isset($x['img']) && $x['img'] === $img) $img = ''; }
    return $img;
  });
  if (preg_match('/^[a-f0-9]{24}\.(jpg|png|webp)$/', $img)) @unlink($upDir . '/' . $img);
  out(200, ['ok' => 1]);
}
if ($action === 'upload' && $post) {
  $buf = file_get_contents('php://input');
  $info = $buf ? @getimagesizefromstring($buf) : false;
  $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
  $mime = is_array($info) && isset($info['mime']) ? $info['mime'] : '';
  if (!isset($types[$mime])) out(400, ['error' => 'image invalide']);
  $name = bin2hex(random_bytes(12)) . '.' . $types[$mime];
  if (file_put_contents($upDir . '/' . $name, $buf) === false) out(500, ['error' => 'ecriture impossible dans uploads']);
  out(200, ['id' => $name]);
}
out(404, ['error' => 'inconnu']);
