<?php
/**
 * WHMCS WhatsApp Notification Hook for Unique-Notify
 * Place this file inside: /whmcs/includes/hooks/unique_notify.php
 */

if (!defined("WHMCS")) {
    die("This file cannot be accessed directly");
}

require_once __DIR__ . '/../UniqueNotifyClient.php';

// ==========================================
// CONFIGURATION (Update with your values)
// ==========================================
$uniqueNotifyUrl = 'https://uniquenotify.itstarlab.com/api/v1';
$uniqueNotifyKey = 'un_live_YOUR_API_KEY';
$uniqueNotifyGateway = 'auto'; // 'meta', 'qr', or 'auto'

WHMCS_UniqueNotify::configure($uniqueNotifyUrl, $uniqueNotifyKey, $uniqueNotifyGateway);

/**
 * 1. Client Signup / Welcome Message
 */
add_hook('ClientAdd', 1, function ($vars) {
    $phone = $vars['phonenumber'];
    $firstName = $vars['firstname'];
    $company = $vars['companyname'] ?: 'IT Star Lab';

    if (empty($phone)) return;

    $message = "*Welcome to {$company}!* \n\n"
             . "Hello {$firstName},\n"
             . "Thank you for registering an account with us. We are excited to have you on board!\n\n"
             . "If you need any assistance, feel free to open a ticket or reply here.";

    WHMCS_UniqueNotify::sendMessage($phone, $message);
});

/**
 * 2. Invoice Created Notification
 */
add_hook('InvoiceCreated', 1, function ($vars) {
    $invoiceId = $vars['invoiceid'];

    // Retrieve Invoice & Client details
    $invoice = localAPI('GetInvoice', ['invoiceid' => $invoiceId]);
    if ($invoice['result'] !== 'success') return;

    $client = localAPI('GetClientsDetails', ['clientid' => $invoice['userid']]);
    if ($client['result'] !== 'success') return;

    $phone = $client['phonenumber'];
    $firstName = $client['firstname'];
    $total = $invoice['total'];
    $dueDate = $invoice['duedate'];
    $currency = $client['currency_code'] ?? 'BDT';

    if (empty($phone)) return;

    $message = "*New Invoice #{$invoiceId} Generated*\n\n"
             . "Hello {$firstName},\n"
             . "Your new invoice has been generated.\n\n"
             . "*Amount:* {$currency} {$total}\n"
             . "*Due Date:* {$dueDate}\n"
             . "*Invoice #:* {$invoiceId}\n\n"
             . "Please log in to your client portal to make the payment. Thank you!";

    WHMCS_UniqueNotify::sendMessage($phone, $message);
});

/**
 * 3. Invoice Paid Confirmation
 */
add_hook('InvoicePaid', 1, function ($vars) {
    $invoiceId = $vars['invoiceid'];

    $invoice = localAPI('GetInvoice', ['invoiceid' => $invoiceId]);
    if ($invoice['result'] !== 'success') return;

    $client = localAPI('GetClientsDetails', ['clientid' => $invoice['userid']]);
    if ($client['result'] !== 'success') return;

    $phone = $client['phonenumber'];
    $firstName = $client['firstname'];
    $total = $invoice['total'];
    $currency = $client['currency_code'] ?? 'BDT';

    if (empty($phone)) return;

    $message = "*Payment Received for Invoice #{$invoiceId}*\n\n"
             . "Dear {$firstName},\n"
             . "We have received your payment of *{$currency} {$total}* for Invoice #{$invoiceId}.\n\n"
             . "Your service is active and updated. Thank you for your business!";

    WHMCS_UniqueNotify::sendMessage($phone, $message);
});

/**
 * 4. Invoice Payment Reminder
 */
add_hook('InvoicePaymentReminder', 1, function ($vars) {
    $invoiceId = $vars['invoiceid'];
    $type = $vars['type']; // 'first', 'second', 'third', 'overdue'

    $invoice = localAPI('GetInvoice', ['invoiceid' => $invoiceId]);
    if ($invoice['result'] !== 'success') return;

    $client = localAPI('GetClientsDetails', ['clientid' => $invoice['userid']]);
    if ($client['result'] !== 'success') return;

    $phone = $client['phonenumber'];
    $firstName = $client['firstname'];
    $total = $invoice['total'];
    $dueDate = $invoice['duedate'];
    $currency = $client['currency_code'] ?? 'BDT';

    if (empty($phone)) return;

    $message = "*Invoice #{$invoiceId} Payment Reminder*\n\n"
             . "Hello {$firstName},\n"
             . "This is a reminder that Invoice #{$invoiceId} of *{$currency} {$total}* is due on *{$dueDate}*.\n\n"
             . "Please complete payment to avoid service interruption.";

    WHMCS_UniqueNotify::sendMessage($phone, $message);
});

/**
 * 5. Support Ticket Admin Reply
 */
add_hook('TicketAdminReply', 1, function ($vars) {
    $ticketId = $vars['ticketid'];
    $ticket = localAPI('GetTicket', ['ticketid' => $ticketId]);
    if ($ticket['result'] !== 'success') return;

    $client = localAPI('GetClientsDetails', ['clientid' => $ticket['userid']]);
    if ($client['result'] !== 'success') return;

    $phone = $client['phonenumber'];
    $firstName = $client['firstname'];
    $subject = $ticket['subject'];
    $ticketMask = $ticket['tid'];

    if (empty($phone)) return;

    $message = "*Support Ticket Reply [Ticket #{$ticketMask}]*\n\n"
             . "Hello {$firstName},\n"
             . "A staff member has replied to your support ticket: *\"{$subject}\"*.\n\n"
             . "Please log in to your client portal to read the response and reply if needed.";

    WHMCS_UniqueNotify::sendMessage($phone, $message);
});
