<?php
// API "Recettes" pour XAMPP (PHP 7.4+). Recettes : data/recipes.json — Prix : data/prices.json — Catégories : data/cats.json — Photos : uploads/
header('Cache-Control: no-store');
$dataDir = __DIR__ . '/data'; $upDir = __DIR__ . '/uploads';
$col = (isset($_GET['col']) && in_array($_GET['col'], ['prices', 'cats'], true)) ? $_GET['col'] : 'recipes';
$dbFile = $dataDir . '/' . $col . '.json';   // recipes.json, prices.json ou cats.json
const IMG_RE = '/^[a-f0-9]{24}\.(jpg|png|webp)$/D';
const MAX_UPLOAD = 8 * 1024 * 1024;           // 8 Mo
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
  $db = (is_string($raw) && trim($raw) !== '') ? json_decode($raw, true) : [];
  // Fichier illisible : on n'écrase surtout pas son contenu
  if (!is_array($db)) { flock($f, LOCK_UN); fclose($f); out(500, ['error' => 'fichier de donnees corrompu : ' . basename($dbFile)]); }
  $res = $fn($db);
  if ($write) {
    $json = json_encode(array_values($db), JSON_UNESCAPED_UNICODE);
    if ($json === false) { flock($f, LOCK_UN); fclose($f); out(500, ['error' => 'encodage impossible']); }
    ftruncate($f, 0); rewind($f);
    $ok = fwrite($f, $json) === strlen($json);
    fflush($f); flock($f, LOCK_UN); fclose($f);
    if (!$ok) out(500, ['error' => 'ecriture incomplete']);
    return $res;
  }
  flock($f, LOCK_UN); fclose($f);
  return $res;
}
// Photo à supprimer si plus aucune entrée ne l'utilise
function unused_img($db, $img) {
  if (!is_string($img) || !preg_match(IMG_RE, $img)) return '';
  foreach ($db as $x) { if (isset($x['img']) && $x['img'] === $img) return ''; }
  return $img;
}

$action = (isset($_GET['action']) && is_string($_GET['action'])) ? $_GET['action'] : '';
$id = (isset($_GET['id']) && is_string($_GET['id'])) ? $_GET['id'] : '';
$post = $_SERVER['REQUEST_METHOD'] === 'POST';
$validId = preg_match('/^[\w-]{1,64}$/D', $id) === 1;

if ($action === 'list') {
  out(200, with_db($dbFile, false, function (&$db) { return array_values($db); }));
}
if ($action === 'save' && $post && $validId) {
  $r = json_decode(file_get_contents('php://input'), true);
  if (!is_array($r)) out(400, ['error' => 'invalide']);
  $r['id'] = $id;
  if (isset($r['img']) && !(is_string($r['img']) && ($r['img'] === '' || preg_match(IMG_RE, $r['img'])))) $r['img'] = '';
  $old = with_db($dbFile, true, function (&$db) use ($r, $id) {
    $prev = '';
    foreach ($db as $i => $x) {
      if (isset($x['id']) && $x['id'] === $id) { $prev = isset($x['img']) ? $x['img'] : ''; $db[$i] = $r; return unused_img($db, $prev); }
    }
    $db[] = $r;
    return '';
  });
  if ($old !== '') @unlink($upDir . '/' . $old);
  out(200, ['ok' => 1]);
}
if ($action === 'delete' && $post && $validId) {
  $img = with_db($dbFile, true, function (&$db) use ($id) {
    $img = ''; $new = [];
    foreach ($db as $x) { if (isset($x['id']) && $x['id'] === $id) { $img = isset($x['img']) ? $x['img'] : ''; } else { $new[] = $x; } }
    $db = $new;
    return unused_img($new, $img);
  });
  if ($img !== '') @unlink($upDir . '/' . $img);
  out(200, ['ok' => 1]);
}
if ($action === 'upload' && $post) {
  if (isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > MAX_UPLOAD) out(413, ['error' => 'image trop lourde']);
  $buf = file_get_contents('php://input', false, null, 0, MAX_UPLOAD + 1);
  if ($buf !== false && strlen($buf) > MAX_UPLOAD) out(413, ['error' => 'image trop lourde']);
  $info = $buf ? @getimagesizefromstring($buf) : false;
  $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
  $mime = is_array($info) && isset($info['mime']) ? $info['mime'] : '';
  if (!isset($types[$mime])) out(400, ['error' => 'image invalide']);
  $name = bin2hex(random_bytes(12)) . '.' . $types[$mime];
  if (file_put_contents($upDir . '/' . $name, $buf) === false) out(500, ['error' => 'ecriture impossible dans uploads']);
  out(200, ['id' => $name]);
}
out(404, ['error' => 'inconnu']);
