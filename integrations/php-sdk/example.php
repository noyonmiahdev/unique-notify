<?php
/**
 * Unique-Notify PHP SDK Usage Examples
 */

require_once __DIR__ . '/UniqueNotify.php';

// Initialize Client with your Server URL and API Key
$apiKey = 'un_live_YOUR_API_KEY';
$serverUrl = 'https://uniquenotify.itstarlab.com';

$client = new UniqueNotify($apiKey, $serverUrl);

echo "=== Unique-Notify PHP Integration Test ===\n\n";

// Example 1: Send High-Speed OTP Code
echo "1. Sending OTP to 01700000000...\n";
$otpResponse = $client->sendOtp(
    phone: '01700000000',
    serviceName: 'MyEcommerce App',
    customOtp: null, // Let server generate 6 random digits
    gateway: 'auto', // Auto-routes to Meta or QR Device
    expiryMinutes: 5
);
print_r($otpResponse);


// Example 2: Verify an OTP Code
echo "\n2. Verifying OTP Code...\n";
$verifyResponse = $client->verifyOtp('01700000000', '123456');
print_r($verifyResponse);


// Example 3: Send Standard WhatsApp Notification (Order Confirmation / Bill)
echo "\n3. Sending Text Notification...\n";
$textResponse = $client->sendText(
    phone: '01700000000',
    message: "*Order Confirmed!*\n\nHello Rahim,\nYour order #10052 has been placed successfully.\nTotal Amount: *৳1,250*.\n\nThank you for shopping with us!"
);
print_r($textResponse);


// Example 4: Send PDF Invoice / Media
echo "\n4. Sending PDF Invoice...\n";
$mediaResponse = $client->sendMedia(
    phone: '01700000000',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    mediaType: 'document',
    caption: 'Here is your monthly hosting invoice.',
    filename: 'Invoice_10052.pdf'
);
print_r($mediaResponse);


// Example 5: Launch Marketing Campaign with Anti-Ban Spintax
echo "\n5. Creating Anti-Ban Broadcast Campaign...\n";
$contacts = [
    ['phone' => '01711111111', 'name' => 'Tanvir'],
    ['phone' => '01722222222', 'name' => 'Akash'],
    ['phone' => '01733333333', 'name' => 'Kamal']
];
$campaignResponse = $client->createCampaign(
    name: 'Weekend Discount 20%',
    messageTemplate: "{Hello|Hi|Greetings} {name}! Enjoy a special *20% discount* on all web hosting plans this weekend. Use coupon code: *WEEKEND20*.",
    contacts: $contacts,
    gateway: 'qr',
    minDelay: 6, // 6-12s random jitter anti-ban delay
    maxDelay: 12
);
print_r($campaignResponse);


// Example 6: Send Direct Cellular SMS via Android Phone (SIM 1 or SIM 2)
echo "\n6. Sending SMS via Android Phone SIM 1...\n";
$smsResponse = $client->sendSms(
    phone: '01700000000',
    message: "Your verification security code is 849201. Do not share this code.",
    simSlot: 1, // 1 for SIM 1, 2 for SIM 2
    gateway: 'android_sim'
);
print_r($smsResponse);


// Example 7: Send SMS via 3rd-Party Aggregator (Greenweb / BulkSMSBD)
echo "\n7. Sending SMS via Greenweb BD...\n";
$greenwebSmsResponse = $client->sendSms(
    phone: '01700000000',
    message: "Thank you for your payment. Invoice #10294 is now paid in full.",
    gateway: 'greenweb'
);
print_r($greenwebSmsResponse);


// Example 8: Send Bulk SMS Broadcast
echo "\n8. Launching SMS Bulk Campaign...\n";
$smsBroadcastResponse = $client->sendSmsBroadcast(
    name: 'Flash Sale SMS Blast',
    message: "{Hi|Hello|Dear customer}, enjoy 30% discount on all cloud services today only!",
    recipients: ['01711111111', '01722222222', '01833333333'],
    simSlot: 1,
    gateway: 'android_sim'
);
print_r($smsBroadcastResponse);

