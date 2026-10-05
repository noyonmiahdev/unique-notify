<?php
/**
 * Unique-Notify Official PHP SDK
 * Zero-dependency modern PHP Client for WhatsApp OTP & Marketing Automation.
 * Compatible with PHP 7.4, 8.0, 8.1, 8.2, 8.3+
 */

class UniqueNotify
{
    private string $baseUrl;
    private string $apiKey;
    private int $timeout;

    /**
     * @param string $apiKey Your API Key from Unique-Notify Dashboard
     * @param string $baseUrl Base URL of your Unique-Notify server (e.g. 'http://localhost:3000' or 'https://notify.yourdomain.com')
     * @param int $timeout Request timeout in seconds
     */
    public function __construct(string $apiKey, string $baseUrl = 'http://localhost:3000', int $timeout = 15)
    {
        $this->apiKey = trim($apiKey);
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->timeout = $timeout;
    }

    /**
     * Internal cURL Request Handler
     */
    private function request(string $method, string $endpoint, array $payload = []): array
    {
        $url = $this->baseUrl . '/api/v1' . $endpoint;
        $ch = curl_init();

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'X-API-Key: ' . $this->apiKey
        ];

        $options = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ];

        if (strtoupper($method) === 'POST') {
            $options[CURLOPT_POST] = true;
            $options[CURLOPT_POSTFIELDS] = json_encode($payload);
        } elseif (strtoupper($method) === 'GET' && !empty($payload)) {
            $options[CURLOPT_URL] = $url . '?' . http_build_query($payload);
        }

        curl_setopt_array($ch, $options);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return [
                'success' => false,
                'message' => 'cURL Error: ' . $error,
                'http_code' => $httpCode
            ];
        }

        $decoded = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'success' => false,
                'message' => 'Invalid JSON Response: ' . $response,
                'http_code' => $httpCode
            ];
        }

        return $decoded;
    }

    /**
     * Send an OTP code to a phone number
     * 
     * @param string $phone Recipient number (e.g. '01712345678' or '8801712345678')
     * @param string $serviceName App or brand name (e.g. 'MyStore' or 'WHMCS')
     * @param string|null $customOtp Optional custom numeric code (if omitted, server auto-generates 6 digits)
     * @param string $gateway 'meta' (Official Cloud API), 'qr' (QR Device), or 'auto' (System Default)
     * @param int $expiryMinutes Expiry duration in minutes (default: 5)
     * @return array
     */
    public function sendOtp(string $phone, string $serviceName = 'Verification', ?string $customOtp = null, string $gateway = 'auto', int $expiryMinutes = 5): array
    {
        $payload = [
            'phone' => $phone,
            'service_name' => $serviceName,
            'gateway' => $gateway,
            'expiry_minutes' => $expiryMinutes
        ];

        if ($customOtp !== null) {
            $payload['custom_otp'] = $customOtp;
        }

        return $this->request('POST', '/otp/send', $payload);
    }

    /**
     * Verify an OTP code
     * 
     * @param string $phone Recipient phone
     * @param string $otpCode OTP entered by user
     * @param string|null $serviceName Service name (optional filter)
     * @return array
     */
    public function verifyOtp(string $phone, string $otpCode, ?string $serviceName = null): array
    {
        $payload = [
            'phone' => $phone,
            'otp_code' => $otpCode
        ];

        if ($serviceName !== null) {
            $payload['service_name'] = $serviceName;
        }

        return $this->request('POST', '/otp/verify', $payload);
    }

    /**
     * Send a standard text message
     * 
     * @param string $phone Recipient phone
     * @param string $message Message body (supports WhatsApp markdown like *bold*, _italic_)
     * @param string $gateway 'auto', 'meta', or 'qr'
     * @return array
     */
    public function sendText(string $phone, string $message, string $gateway = 'auto'): array
    {
        return $this->request('POST', '/messages/send-text', [
            'phone' => $phone,
            'message' => $message,
            'gateway' => $gateway
        ]);
    }

    /**
     * Send Media / PDF / Image / Invoice
     * 
     * @param string $phone Recipient phone
     * @param string $mediaUrl Direct URL of the media/pdf
     * @param string $mediaType 'image', 'document', 'pdf', 'video', 'audio'
     * @param string $caption Optional caption text
     * @param string $filename File name (e.g. 'Invoice_#1002.pdf')
     * @param string $gateway 'auto', 'meta', or 'qr'
     * @return array
     */
    public function sendMedia(string $phone, string $mediaUrl, string $mediaType = 'image', string $caption = '', string $filename = '', string $gateway = 'auto'): array
    {
        return $this->request('POST', '/messages/send-media', [
            'phone' => $phone,
            'media_url' => $mediaUrl,
            'media_type' => $mediaType,
            'caption' => $caption,
            'filename' => $filename,
            'gateway' => $gateway
        ]);
    }

    /**
     * Send Meta Official Approved Template Message
     * 
     * @param string $phone Recipient phone
     * @param string $templateName Name of approved template on Meta
     * @param string $languageCode e.g. 'en_US' or 'bn'
     * @param array $components Template components parameters
     * @return array
     */
    public function sendTemplate(string $phone, string $templateName, string $languageCode = 'en_US', array $components = []): array
    {
        return $this->request('POST', '/messages/send-template', [
            'phone' => $phone,
            'template_name' => $templateName,
            'language_code' => $languageCode,
            'components' => $components
        ]);
    }

    /**
     * Launch a bulk marketing broadcast campaign
     * 
     * @param string $name Campaign title
     * @param string $messageTemplate Template text with Spintax {Hi|Hello} and variables {name}
     * @param array $contacts Array of ['phone' => '...', 'name' => '...']
     * @param string $gateway 'qr' or 'meta'
     * @param int $minDelay Anti-ban minimum delay in seconds (default: 5)
     * @param int $maxDelay Anti-ban maximum delay in seconds (default: 15)
     * @return array
     */
    public function createCampaign(string $name, string $messageTemplate, array $contacts, string $gateway = 'qr', int $minDelay = 5, int $maxDelay = 15): array
    {
        return $this->request('POST', '/broadcasts/create', [
            'name' => $name,
            'message_template' => $messageTemplate,
            'contacts' => $contacts,
            'gateway_type' => $gateway,
            'min_delay_sec' => $minDelay,
            'max_delay_sec' => $maxDelay,
            'auto_start' => true
        ]);
    }

    /**
     * Get device and gateway status
     * @return array
     */
    public function getDevices(): array
    {
        return $this->request('GET', '/devices');
    }

    /**
     * Send Cellular SMS via Android Phone (SIM 1 / SIM 2) or 3rd-Party Gateway
     * 
     * @param string $phone Recipient mobile number (e.g. '01712345678' or '+8801712345678')
     * @param string $message SMS text body
     * @param int $simSlot SIM slot for Android gateway: 1 (SIM 1) or 2 (SIM 2)
     * @param string $gateway 'android_sim', 'greenweb', 'bulksmsbd', or 'custom_http'
     * @return array
     */
    public function sendSms(string $phone, string $message, int $simSlot = 1, string $gateway = 'android_sim'): array
    {
        return $this->request('POST', '/sms/send', [
            'recipient' => $phone,
            'message' => $message,
            'gateway_type' => $gateway,
            'sim_slot' => $simSlot
        ]);
    }

    /**
     * Send SMS Bulk Broadcast Campaign
     * 
     * @param string $name Campaign title
     * @param string $message Message body (supports Spintax {Hi|Hello})
     * @param array $recipients List of phone numbers ['01711111111', '01722222222']
     * @param int $simSlot 1 or 2
     * @param string $gateway 'android_sim', 'greenweb', 'bulksmsbd', 'custom_http'
     * @return array
     */
    public function sendSmsBroadcast(string $name, string $message, array $recipients, int $simSlot = 1, string $gateway = 'android_sim'): array
    {
        return $this->request('POST', '/sms/broadcast', [
            'campaign_name' => $name,
            'message' => $message,
            'recipients' => $recipients,
            'gateway_type' => $gateway,
            'sim_slot' => $simSlot
        ]);
    }

    /**
     * Get connected Android SMS Gateway devices
     * @return array
     */
    public function getSmsDevices(): array
    {
        return $this->request('GET', '/sms/devices');
    }

    /**
     * Get SMS Queue & Delivery Logs
     * 
     * @param int $limit
     * @param string|null $status 'queued', 'sending', 'sent', 'delivered', 'failed'
     * @return array
     */
    public function getSmsLogs(int $limit = 50, ?string $status = null): array
    {
        $params = ['limit' => $limit];
        if ($status !== null) {
            $params['status'] = $status;
        }
        return $this->request('GET', '/sms/logs', $params);
    }
}
