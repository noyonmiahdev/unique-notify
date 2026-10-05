<?php
/**
 * WHMCS Helper Client for Unique-Notify WhatsApp Automation
 */

if (!defined('WHMCS')) {
    // allow direct loading if needed
}

class WHMCS_UniqueNotify
{
    private static string $apiUrl = 'http://localhost:3000/api/v1';
    private static string $apiKey = 'un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c';
    private static string $gateway = 'auto'; // 'meta', 'qr', or 'auto'

    public static function configure(string $apiUrl, string $apiKey, string $gateway = 'auto'): void
    {
        self::$apiUrl = rtrim($apiUrl, '/');
        self::$apiKey = trim($apiKey);
        self::$gateway = $gateway;
    }

    public static function sendMessage(string $phone, string $message): array
    {
        $ch = curl_init(self::$apiUrl . '/messages/send-text');
        $payload = json_encode([
            'phone' => $phone,
            'message' => $message,
            'gateway' => self::$gateway
        ]);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-API-Key: ' . self::$apiKey
            ],
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
        ]);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true) ?: [];
    }
}
