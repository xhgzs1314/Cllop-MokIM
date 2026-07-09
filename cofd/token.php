<?php
class TokenUtil
{
    private static $secretKey = 'yhto_keyuop_keyumz_gar_robt';
    public static function generateToken()
    {
        $userId = 'trust_tokenmo';
        $timestamp = time();
        $nonce = self::generateNonce(16);
        $broserFingerprint = self::generateBrowserFingerprint();
        $hash = self::generateHash($userId, $timestamp, $nonce, $broserFingerprint);
        return base64_encode("$timestamp:$nonce:$userId:$broserFingerprint:$hash");
    }
    public static function validateToken($token,$maybetime=300)
    {
        $userId = 'trust_tokenmo';
        $currentFingerprint = self::generateBrowserFingerprint();
        if (empty($token) || empty($userId) || empty($currentFingerprint)) {
            return false;
        }
        $decoded = base64_decode($token);
        if ($decoded === false) {
            return false;
        }
        list($timestamp, $nonce, $tokenUserId, $tokenFingerprint, $hash) = explode(':', $decoded, 5);
        if (empty($timestamp) || empty($nonce) || empty($tokenUserId) || empty($tokenFingerprint) || empty($hash)) {
            return false;
        }
        if ($tokenUserId !== 'trust_tokenmo') {
            return false;
        }
        if ($tokenFingerprint !== $currentFingerprint) {
            return false;
        }
        if (time() - (int)$timestamp > $maybetime) {
            return false;
        }
        return self::generateHash($userId, $timestamp, $nonce, $tokenFingerprint) === $hash;
    }

    public static function generateBrowserFingerprint()
    {
        $fingerprintData = [];
        if (!empty($_SERVER['HTTP_USER_AGENT'])) {
            $fingerprintData[] = $_SERVER['HTTP_USER_AGENT'];
        }
        if (!empty($_SERVER['HTTP_SEC_CH_UA'])) {
            $fingerprintData[] = $_SERVER['HTTP_SEC_CH_UA'];
        }
        if (!empty($_SERVER['HTTP_SEC_CH_UA_PLATFORM'])) {
            $fingerprintData[] = $_SERVER['HTTP_SEC_CH_UA_PLATFORM'];
        }
        if (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
            $fingerprintData[] = $_SERVER['HTTP_ACCEPT_LANGUAGE'];
        }
        if (!empty($_SERVER['REMOTE_ADDR'])) {
            $fingerprintData[] = hash('sha256', self::$secretKey . $_SERVER['REMOTE_ADDR']);
        }
        return hash('sha256', implode('|', $fingerprintData));
    }
    private static function generateHash($userId, $timestamp, $nonce, $fingerprint)
    {
        return hash('sha256', self::$secretKey . $userId . $timestamp . $nonce . $fingerprint);
    }

    private static function generateNonce($length)
    {
        $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $nonce = '';
        for ($i = 0; $i < $length; $i++) {
            $nonce .= $chars[rand(0, strlen($chars) - 1)];
        }
        return $nonce;
    }
}
