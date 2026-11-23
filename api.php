<?php
// API "Recettes" pour XAMPP (PHP 7.4+). Recettes : data/recipes.json — Prix : data/prices.json — Catégories : data/cats.json — Glaces perso : data/glaces.json — Photos : uploads/
// Compte administrateur : data/admin.json (créé à la première connexion). Lecture libre ; toute modification exige d'être connecté en admin.
// Mot de passe oublié : supprimez data/admin.json puis recréez le compte depuis le site.
header('Cache-Control: no-store');
$dataDir = __DIR__ . '/data'; $upDir = __DIR__ . '/uploads';
$col = (isset($_GET['col']) && in_array($_GET['col'], ['prices', 'cats', 'glaces'], true)) ? $_GET['col'] : 'recipes';
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

// ---- Authentification administrateur ----
$adminFile = $dataDir . '/admin.json';
$throttleFile = $dataDir . '/login-throttle.json';
const MAX_FAILS = 5;          // tentatives ratées autorisées…
const FAIL_WINDOW = 900;      // …par adresse IP sur 15 minutes
function body_json() { $b = json_decode(file_get_contents('php://input'), true); return is_array($b) ? $b : []; }
function str_field($b, $k) { return isset($b[$k]) && is_string($b[$k]) ? $b[$k] : ''; }
function admin_account($adminFile) {
  if (!is_file($adminFile)) return null;
  $a = json_decode((string)@file_get_contents($adminFile), true);
  return (is_array($a) && isset($a['user'], $a['hash']) && is_string($a['user']) && is_string($a['hash'])) ? $a : null;
}
function save_admin($adminFile, $user, $pass, $exclusive) {
  $json = json_encode(['user' => $user, 'hash' => password_hash($pass, PASSWORD_DEFAULT)], JSON_UNESCAPED_UNICODE);
  if ($exclusive) {   // création : échoue si un compte existe déjà (pas d'écrasement en cas de requêtes simultanées)
    $f = @fopen($adminFile, 'x');
    if (!$f) return false;
    $ok = fwrite($f, $json) === strlen($json); fclose($f); return $ok;
  }
  return @file_put_contents($adminFile, $json, LOCK_EX) === strlen($json);
}
function start_session() {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
  session_name('recettes_sid');
  session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'secure' => $https, 'samesite' => 'Strict']);
  session_start();
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
function is_admin($adminFile) {
  $a = admin_account($adminFile);
  return $a && !empty($_SESSION['admin']) && $_SESSION['admin'] === $a['user'] && isset($_SESSION['ah']) && hash_equals($_SESSION['ah'], hash('sha256', $a['hash']));
}
function log_in($a) {
  session_regenerate_id(true);
  $_SESSION['admin'] = $a['user'];
  $_SESSION['ah'] = hash('sha256', $a['hash']);   // un changement de mot de passe déconnecte les autres sessions
  $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
function me($adminFile) {
  $a = admin_account($adminFile); $ok = is_admin($adminFile);
  return ['admin' => $ok, 'user' => $ok ? $a['user'] : '', 'setup' => $a === null, 'csrf' => $_SESSION['csrf']];
}
// Garde-fou des actions de modification : session admin + jeton anti-CSRF (en-tête X-CSRF-Token)
function require_admin($adminFile) {
  start_session();
  $tok = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? (string)$_SERVER['HTTP_X_CSRF_TOKEN'] : '';
  if (!is_admin($adminFile)) out(401, ['error' => 'connexion administrateur requise']);
  if (!hash_equals($_SESSION['csrf'], $tok)) out(403, ['error' => 'jeton de securite invalide : rechargez la page']);
  session_write_close();   // libère le verrou de session pendant l'écriture des données
}
// Limitation des tentatives de connexion par IP
function throttle($file, $ip, $fail) {
  $f = @fopen($file, 'c+'); if (!$f) return true;
  flock($f, LOCK_EX);
  $t = json_decode((string)stream_get_contents($f), true); if (!is_array($t)) $t = [];
  $now = time();
  foreach ($t as $k => $v) { $t[$k] = array_values(array_filter(is_array($v) ? $v : [], function ($x) use ($now) { return is_int($x) && $x > $now - FAIL_WINDOW; })); if (!$t[$k]) unset($t[$k]); }
  $ok = !isset($t[$ip]) || count($t[$ip]) < MAX_FAILS;
  if ($fail === true) $t[$ip][] = $now;
  if ($fail === false) unset($t[$ip]);
  ftruncate($f, 0); rewind($f); fwrite($f, json_encode($t)); fflush($f);
  flock($f, LOCK_UN); fclose($f);
  return $ok;
}

$action = (isset($_GET['action']) && is_string($_GET['action'])) ? $_GET['action'] : '';
$id = (isset($_GET['id']) && is_string($_GET['id'])) ? $_GET['id'] : '';
$post = $_SERVER['REQUEST_METHOD'] === 'POST';
$validId = preg_match('/^[\w-]{1,64}$/D', $id) === 1;

$ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '?';
if ($action === 'me') { start_session(); out(200, me($adminFile)); }
if ($action === 'setup' && $post) {
  start_session();
  if (admin_account($adminFile)) out(409, ['error' => 'un compte administrateur existe deja']);
  $b = body_json(); $user = trim(str_field($b, 'user')); $pass = str_field($b, 'pass');
  if ($user === '' || strlen($user) > 128) out(400, ['error' => 'identifiant invalide']);
  if (strlen($pass) < 8) out(400, ['error' => 'mot de passe trop court (8 caracteres minimum)']);
  if (!save_admin($adminFile, $user, $pass, true)) out(409, ['error' => 'creation impossible (compte deja cree ou dossier data non accessible en ecriture)']);
  log_in(admin_account($adminFile));
  out(200, me($adminFile));
}
if ($action === 'login' && $post) {
  start_session();
  if (!throttle($throttleFile, $ip, null)) out(429, ['error' => 'trop de tentatives : reessayez dans 15 minutes']);
  $b = body_json(); $a = admin_account($adminFile);
  $ok = $a && hash_equals($a['user'], trim(str_field($b, 'user'))) && password_verify(str_field($b, 'pass'), $a['hash']);
  if (!$ok) { throttle($throttleFile, $ip, true); usleep(800000); out(401, ['error' => 'identifiant ou mot de passe incorrect']); }
  throttle($throttleFile, $ip, false);
  if (password_needs_rehash($a['hash'], PASSWORD_DEFAULT)) { save_admin($adminFile, $a['user'], str_field($b, 'pass'), false); $a = admin_account($adminFile); }
  log_in($a);
  out(200, me($adminFile));
}
if ($action === 'logout' && $post) {
  start_session();
  $_SESSION = [];
  session_regenerate_id(true);
  $_SESSION['csrf'] = bin2hex(random_bytes(16));
  out(200, me($adminFile));
}
if ($action === 'passwd' && $post) {
  require_admin($adminFile);
  $b = body_json(); $a = admin_account($adminFile); $nu = trim(str_field($b, 'user')); $np = str_field($b, 'new');
  if (!password_verify(str_field($b, 'old'), $a['hash'])) out(400, ['error' => 'mot de passe actuel incorrect']);
  if ($nu === '') $nu = $a['user'];
  if (strlen($nu) > 128) out(400, ['error' => 'identifiant invalide']);
  if ($np === '') $np = str_field($b, 'old');
  elseif (strlen($np) < 8) out(400, ['error' => 'mot de passe trop court (8 caracteres minimum)']);
  if (!save_admin($adminFile, $nu, $np, false)) out(500, ['error' => 'ecriture impossible : verifiez les droits du dossier data']);
  start_session(); log_in(admin_account($adminFile));
  out(200, me($adminFile));
}
// Toutes les actions suivantes, sauf la lecture, modifient les données
if (in_array($action, ['save', 'delete', 'upload'], true) && $post) require_admin($adminFile);

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
