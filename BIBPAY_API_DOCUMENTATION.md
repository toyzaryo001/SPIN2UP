# 🏦 BibPay Payment Gateway - Complete Documentation

**Document Version:** 1.0
**Last Updated:** 2026-02-28
**Project:** SPIN2UP Gaming Platform
**Status:** Complete Implementation with Security Review

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Request/Response Structures](#requestresponse-structures)
4. [Authentication & Headers](#authentication--headers)
5. [Error Handling](#error-handling)
6. [Bank Codes](#bank-codes)
7. [Webhook System](#webhook-system)
8. [Implementation Status](#implementation-status)
9. [Security Considerations](#security-considerations)
10. [Flow Diagrams](#flow-diagrams)
11. [Configuration](#configuration)
12. [Troubleshooting](#troubleshooting)

---

## Overview

### What is BibPay?

BibPay is a Thai payment gateway provider that enables:
- **Deposits (Payin):** QR code-based payments for user deposits
- **Withdrawals (Payout):** Automated bank transfers for withdrawals
- **Balance Management:** Account balance checking and transaction status reporting
- **Multi-Bank Support:** Integration with major Thai banks

### Base API URL

```
https://api.bibbyx.com/api/v1/mc
```

**Configuration Customization:**
```typescript
// Can be overridden in PaymentGateway config
{
  "apiEndpoint": "https://custom-url.com/api/v1/mc"
}
```

### Key Features

✅ **Deposit (Payin)**
- Generate QR codes for bank transfers
- Support for 6+ Thai banks
- Webhook confirmation on completion

✅ **Auto-Withdrawal (Payout)**
- Automated bank transfer processing
- Async status confirmation via webhook
- Refund logic on failure

✅ **Balance Checking**
- Real-time balance queries
- Error handling with safe defaults

✅ **Transaction Tracking**
- Check individual transaction status
- Retrieve transaction history

❌ **Not Supported**
- Signature-based webhook verification (currently)
- OAuth or complex authentication

---

## API Endpoints

### Complete Endpoint Reference

| # | Endpoint | Method | Purpose | Auth |
|---|----------|--------|---------|------|
| 1 | `/payin` | POST | Create deposit (QR code) | API Key |
| 2 | `/payout` | POST | Create withdrawal | API Key |
| 3 | `/balance` | POST | Get account balance | API Key |
| 4 | `/transaction/check` | POST | Check transaction status | API Key |
| 5 | `/bank` | POST | Get supported banks list | API Key |

---

## Request/Response Structures

### 1️⃣ PAYIN (Deposit/QR Code Upload)

**Creates a QR code for user to scan and pay**

#### Request

```http
POST https://api.bibbyx.com/api/v1/mc/payin
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "bankName": "สมชายโชติภูมิ",
  "bankNumber": "1234567890",
  "bankCode": "014",
  "amount": 500.00,
  "refferend": "PAYIN_1704067200123_42",
  "signatrure": "YOUR_API_KEY",
  "callbackUrl": "https://api.check24m.com/api/webhooks/payment/bibpay"
}
```

#### Request Field Details

| Field | Type | Required | Max Length | Notes |
|-------|------|----------|-----------|-------|
| `bankName` | string | Yes | 100 | Customer's full name |
| `bankNumber` | string | Yes | 20 | Bank account number |
| `bankCode` | string | Yes | 3 | Bank code (see bank list) |
| `amount` | number | Yes | - | Must be fixed to 2 decimals |
| `refferend` | string | Yes | 50 | **API Typo:** Our internal transaction ID |
| `signatrure` | string | Yes | - | **API Typo:** Your API key (authentication) |
| `callbackUrl` | string | Yes | 255 | Webhook URL for payment notification |

#### Response (Success)

```json
{
  "status": true,
  "data": {
    "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAM...",
    "transactionId": "TXN_2024_001234",
    "depositAmount": 500.00,
    "refferend": "PAYIN_1704067200123_42"
  },
  "msg": "Success"
}
```

#### Response (Error)

```json
{
  "status": false,
  "msg": "Invalid bank code",
  "message": "Bank code 999 not supported"
}
```

#### QR Code Handling

The API may return QR code in various formats:

```javascript
// Possible field names the API uses
data.qrcode
data.qr_code
data.qrCode
data.qr
data.image
data.qr_image

// Format Detection & Normalization
if (qrCode && !qrCode.startsWith('http') && !qrCode.startsWith('data:image')) {
  qrCode = `data:image/png;base64,${qrCode}`;
}
```

---

### 2️⃣ PAYOUT (Withdrawal)

**Initiates automated bank transfer to user's account**

#### Request

```http
POST https://api.bibbyx.com/api/v1/mc/payout
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "bankName": "สมชายโชติภูมิ",
  "bankNumber": "1234567890",
  "bankCode": "014",
  "amount": 500.00,
  "refferend": "PAYOUT_TXN_001_42",
  "signatrure": "YOUR_API_KEY",
  "callbackUrl": "https://api.check24m.com/api/webhooks/payment/bibpay"
}
```

#### Request Field Details

Same as **PAYIN** - identical structure

#### Response (Success)

```json
{
  "status": true,
  "data": {
    "transactionId": "TXN_2024_005678",
    "refferend": "PAYOUT_TXN_001_42",
    "amount": 500.00
  },
  "msg": "Payout initiated"
}
```

#### Response (Error)

```json
{
  "status": false,
  "msg": "Insufficient balance"
}
```

#### Important Notes

⚠️ **CRITICAL:** This endpoint may be **NOT YET CONFIRMED** to exist in BibPay API
- Implementation assumes it exists
- Will return 404 if endpoint unavailable
- No fallback mechanism implemented
- **Action Required:** Confirm with BibPay support

---

### 3️⃣ BALANCE (Get Account Balance)

**Queries current account balance in BibPay**

#### Request

```http
POST https://api.bibbyx.com/api/v1/mc/balance
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "signatrure": "YOUR_API_KEY"
}
```

#### Response (Success)

```json
{
  "status": true,
  "data": {
    "balance": 10000.50
  },
  "msg": "Balance retrieved"
}
```

#### Response (Error)

```json
{
  "status": false,
  "msg": "Invalid API key"
}
```

---

### 4️⃣ TRANSACTION/CHECK (Check Transaction Status)

**Queries status of a specific transaction**

#### Request

```http
POST https://api.bibbyx.com/api/v1/mc/transaction/check
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "referenceId": "PAYIN_1704067200123_42",
  "signatrure": "YOUR_API_KEY"
}
```

#### Response (Success)

```json
{
  "status": true,
  "data": {
    "transactionId": "TXN_2024_001234",
    "refferend": "PAYIN_1704067200123_42",
    "status": "completed",
    "amount": 500.00,
    "depositAmount": 500.00,
    "message": "Transaction completed successfully"
  }
}
```

#### Possible Status Values

| Status | Meaning | Maps To | Action |
|--------|---------|---------|--------|
| `completed` | Payment successful | `SUCCESS` | Credit balance |
| `success` | Payment successful | `SUCCESS` | Credit balance |
| `failed` | Payment failed | `FAILED` | Mark failed |
| `fail` | Payment failed | `FAILED` | Mark failed |
| `timeout` | Payment timeout | `FAILED` | Mark failed |
| `expired` | Payment expired | `FAILED` | Mark failed |
| *(other)* | Unknown status | `PENDING` | Wait for update |

---

### 5️⃣ BANK (Get Supported Banks List)

**Retrieves list of banks supported for transfers**

#### Request

```http
POST https://api.bibbyx.com/api/v1/mc/bank
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "signatrure": "YOUR_API_KEY"
}
```

#### Response (Success)

```json
{
  "status": true,
  "data": [
    {
      "bankCode": "004",
      "bankName": "Kasikornbank",
      "bankShortName": "KBANK"
    },
    {
      "bankCode": "014",
      "bankName": "Siam Commercial Bank",
      "bankShortName": "SCB"
    },
    {
      "bankCode": "002",
      "bankName": "Bangkok Bank",
      "bankShortName": "BBL"
    },
    {
      "bankCode": "006",
      "bankName": "Krung Thai Bank",
      "bankShortName": "KTB"
    },
    {
      "bankCode": "030",
      "bankName": "Government Savings Bank",
      "bankShortName": "GSB"
    },
    {
      "bankCode": "025",
      "bankName": "Bank of Ayudhya Public Company Limited",
      "bankShortName": "BAY"
    }
  ],
  "msg": "Success"
}
```

---

## Authentication & Headers

### Required Headers (All Endpoints)

```javascript
{
  "Content-Type": "application/json",
  "x-api-key": "YOUR_API_KEY_HERE"
}
```

### Authentication Method

**Type:** API Key + Payload Signature

**Key Placement:**
1. **Header:** `x-api-key` header must contain your API key
2. **Payload:** `signatrure` field must also contain your API key

**Example:**
```typescript
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': 'bibpay_abc123def456'  // ← In header
};

const payload = {
  bankName: 'สมชาย',
  bankNumber: '1234567890',
  bankCode: '014',
  amount: 500.00,
  refferend: 'PAYIN_123_42',
  signatrure: 'bibpay_abc123def456',  // ← Also in payload
  callbackUrl: 'https://...'
};
```

### API Key Management

**Storage Location:**
```typescript
// In PaymentGateway database model
{
  code: 'bibpay',
  name: 'BibPay',
  config: {
    "apiKey": "YOUR_API_KEY",           // ← Store here
    "secretKey": "OPTIONAL_SECRET_KEY", // ← If provided
    "apiEndpoint": "https://api.bibbyx.com/api/v1/mc",
    "callbackUrl": "https://your-domain.com/api/webhooks/payment/bibpay"
  },
  isActive: true,
  sortOrder: 1
}
```

**Retrieval in Code:**
```typescript
// backend/src/services/payment/providers/BibPayProvider.ts
constructor(config: BibPayConfig) {
  this.config = config;
  // config.apiKey is used for all authentication
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| `200` | Success/Error (check `status` field) | All valid requests |
| `400` | Bad Request (invalid parameters) | Missing required fields |
| `401` | Unauthorized (invalid API key) | Wrong or expired API key |
| `404` | Not Found (endpoint doesn't exist) | /payout endpoint not available |
| `500` | Server Error | BibPay service error |

### Response Status Field

The `status` field determines success/failure:

```javascript
if (response.data.status === true) {
  // Success - use data
  console.log('Transaction:', response.data.data);
} else if (response.data.status === false) {
  // Error - check msg field
  console.error('Error:', response.data.msg);
}
```

### Error Message Fields

API uses either `msg` or `message` field:

```javascript
const errorMessage = response.data.msg || response.data.message;
```

### Common Errors

| Message | Cause | Solution |
|---------|-------|----------|
| `Invalid bank code` | Bank code invalid or not supported | Use valid 3-digit code from /bank endpoint |
| `Insufficient balance` | Account balance too low | Check balance with /balance endpoint |
| `Invalid amount format` | Amount not properly formatted | Use `.toFixed(2)` for decimal places |
| `Missing required fields` | Required field missing from payload | Check all mandatory fields present |
| `Invalid API key` | API key wrong or expired | Verify in database configuration |
| `Transaction not found` | Reference ID doesn't exist | Verify referenceId in webhook |
| `Bank not supported` | Bank not in provider's list | Fetch latest from /bank endpoint |

### Error Response Example

```json
{
  "status": false,
  "msg": "Invalid bank code",
  "message": "Bank code 999 is not supported. Valid codes: 004, 014, 002, 006, 030, 025"
}
```

### Handling Errors in Code

```typescript
async createPayin(amount: number, user: any, referenceId: string) {
  try {
    const response = await axios.post(`${this.baseUrl}/payin`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey
      }
    });

    const result = response.data;

    if (!result.status) {
      // API returned error in payload
      return {
        success: false,
        message: result.msg || result.message || 'Unknown error from BIBPAY',
        rawResponse: result
      };
    }

    // Process successful response
    return {
      success: true,
      transactionId: result.data.transactionId,
      qrCode: result.data.qrcode,
      amount: result.data.depositAmount || amount,
      referenceId: referenceId,
      rawResponse: result
    };

  } catch (error: any) {
    // Network error or HTTP error
    console.error('BibPay CreatePayin Error:', error.response?.data || error.message);

    const errData = error.response?.data;
    return {
      success: false,
      message: errData?.msg || errData?.message || error.message,
      rawResponse: errData
    };
  }
}
```

---

## Bank Codes

### Supported Thai Banks

**Complete List:**

| Bank Code | Bank Name (TH) | Bank Name (EN) | Short Code | Reference |
|-----------|----------------|----------------|-----------|-----------|
| `004` | ธนาคารกสิกรไทย | Kasikornbank | KBANK | Primary |
| `014` | ธนาคารสยามพาณิชย์ | Siam Commercial Bank | SCB | **DEFAULT** |
| `006` | ธนาคารกรุงไทย | Krung Thai Bank | KTB | Primary |
| `002` | ธนาคารกรุงเทพ | Bangkok Bank | BBL | Primary |
| `030` | ธนาคารออมสิน | Government Savings Bank | GSB | Government |
| `025` | ธนาคารกรุงอยุธยา | Bank of Ayudhya | BAY | Secondary |

### Bank Code Mapping in Current Implementation

```typescript
// backend/src/services/payment/providers/BibPayProvider.ts
private mapBankCode(bankName: string): string | null {
  const map: Record<string, string> = {
    'kbank': '004',  // ธนาคารกสิกรไทย
    'scb': '014',    // ธนาคารสยามพาณิชย์
    'ktb': '006',    // ธนาคารกรุงไทย
    'bbl': '002',    // ธนาคารกรุงเทพ
    'gsb': '030',    // ธนาคารออมสิน
    'bay': '025'     // ธนาคารกรุงอยุธยา
  };

  if (!bankName) return null;

  // Normalize: lowercase, remove special chars
  const normalized = bankName.toLowerCase().replace(/[^a-z]/g, '');

  // Match against mapping
  for (const key in map) {
    if (normalized.includes(key)) return map[key];
  }

  return null; // Caller will default to SCB ('014')
}
```

### Bank Code Selection Logic

```javascript
1. User selects/enters bank name
   ↓
2. Normalize name (lowercase, remove special chars)
   ↓
3. Search hardcoded mapping
   ↓
4. If found → Use that code
   If NOT found → Return null
   ↓
5. If null → Default to SCB ('014')
   (Safe default - most widely used)
```

### Recommended Improvement

⚠️ **ISSUE:** Only 6 banks hardcoded, many Thai banks not supported

**Solution:**
```typescript
// 1. Fetch from /bank endpoint on startup
// 2. Cache in-memory or Redis
// 3. Update user's bank selector dropdown
// 4. Validate bank code before API call

async init() {
  const bankList = await this.getBankList();
  // Store in cache
  BANK_CODE_MAP = new Map(bankList.data.map(b => [b.bankName.toLowerCase(), b.bankCode]));
}

// 2. Dynamic mapping
private getMappedBankCode(bankName: string): string | null {
  return BANK_CODE_MAP.get(bankName.toLowerCase()) || null;
}
```

---

## Webhook System

### Webhook Endpoint Configuration

**Webhook URL Format:**
```
POST https://your-domain.com/api/webhooks/payment/:gateway
```

**For BibPay Specifically:**
```
POST https://your-domain.com/api/webhooks/payment/bibpay
```

**Configuration in Database:**
```json
{
  "callbackUrl": "https://your-domain.com/api/webhooks/payment/bibpay"
}
```

### Webhook Payload Structure

When BibPay completes a transaction, it sends:

```json
{
  "status": "completed",
  "data": {
    "transactionId": "TXN_2024_001234",
    "refferend": "PAYIN_1704067200123_42",
    "amount": 500.00,
    "depositAmount": 500.00,
    "message": "Payment received"
  },
  "message": "Transaction completed successfully"
}
```

### Webhook Processing Flow

```
1. Receive webhook POST request
   ↓
2. Extract status and transaction data
   ↓
3. Parse amount (use depositAmount if available, fallback to amount)
   ↓
4. Normalize status to: SUCCESS | FAILED | PENDING
   ↓
5. Find matching transaction by referenceId or externalId
   ↓
6. Update transaction status in database
   ↓
7. If SUCCESS:
     - Credit user balance
     - Transfer to game wallet (Betflix)

   If FAILED:
     - Mark transaction failed
     - For deposit: no action (payment didn't arrive)
     - For withdraw: refund balance back to user
   ↓
8. Return 200 OK to BibPay
```

### Webhook Handler Implementation

```typescript
// backend/src/services/payment/providers/BibPayProvider.ts
async processWebhook(payload: any): Promise<WebhookResult> {
  console.log('BibPay Webhook Payload:', JSON.stringify(payload));

  const status = payload.status;
  const txData = payload.data || {};
  const refId = txData.refferend;  // Our reference
  const externalId = txData.transactionId;  // BibPay's ID

  // Use depositAmount (actual) over amount (requested)
  const amountStr = txData.depositAmount || txData.amount || '0';
  const amount = parseFloat(amountStr);

  let txStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';

  if (status === 'completed' || status === 'success') {
    txStatus = 'SUCCESS';
  } else if (['timeout', 'expired', 'failed', 'fail'].includes(status)) {
    txStatus = 'FAILED';
  }

  return {
    success: true,
    txStatus,
    transactionId: refId || '',
    externalId,
    amount,
    message: payload.message,
    rawResponse: payload
  };
}
```

### Expected Webhook Response

```json
{
  "success": true
}
```

### Testing Webhooks

**Script Location:** `/backend/scripts/test-bibpay.ts`

```typescript
import axios from 'axios';

const payload = {
  status: 'completed',
  data: {
    transactionId: 'TXN_2024_001234',
    refferend: 'PAYIN_1704067200123_42',
    amount: 500.00,
    depositAmount: 500.00
  },
  message: 'Test webhook'
};

// Send to webhook endpoint
await axios.post(
  'http://localhost:3001/api/webhooks/payment/bibpay',
  payload,
  { headers: { 'Content-Type': 'application/json' } }
);
```

---

## Implementation Status

### ✅ Fully Implemented

- [x] Payin (Deposit/QR Code)
- [x] Payout (Withdrawal) - **Endpoint not confirmed**
- [x] Balance checking
- [x] Transaction status checking
- [x] Bank list retrieval
- [x] Webhook processing
- [x] Error handling
- [x] Auto-withdrawal feature

### ⚠️ Partially Implemented / Issue

- [ ] Webhook signature verification (returns true always)
- [ ] Payout endpoint confirmation (may not exist)
- [ ] Dynamic bank list fetching (uses hardcoded mapping)
- [ ] Comprehensive error logging (uses console.error)

### ❌ Not Implemented

- [ ] Rate limiting
- [ ] Transaction reconciliation
- [ ] Webhook retry mechanism
- [ ] HTTP 4xx status codes for validation errors (returns 200 instead)

---

## Security Considerations

### 🔴 CRITICAL ISSUES

#### Issue 1: No Webhook Verification

**Location:** `/backend/src/services/payment/providers/BibPayProvider.ts:162-167`

**Current Code:**
```typescript
verifyWebhook(payload: any, headers: any): boolean {
  // BIBPAY might not have a strong signature verification in v1/mc
  // We can check if the payload structure matches what we expect.
  return true;  // ⚠️ ALWAYS RETURNS TRUE - NO ACTUAL VERIFICATION
}
```

**Risk:** 🔴 **CRITICAL**
- Any attacker can craft fake webhook payloads
- Can credit accounts without real payment
- Can process refunds without authorization
- No IP whitelist or signature validation

**Solution:**
```typescript
// Option 1: IP Whitelist
const BIBPAY_IPS = ['1.2.3.4', '5.6.7.8'];  // Get from BibPay
function verifyWebhook(payload: any, headers: any, clientIp: string): boolean {
  return BIBPAY_IPS.includes(clientIp);
}

// Option 2: HMAC Signature (if BibPay supports)
function verifyWebhook(payload: any, signature: string): boolean {
  const computed = hmac('sha256', SECRET_KEY, JSON.stringify(payload));
  return computed === signature;
}

// Option 3: Payload validation + timestamp check
function verifyWebhook(payload: any): boolean {
  // Check required fields
  if (!payload.data?.transactionId || !payload.data?.refferend) return false;

  // Check timestamp isn't too old (prevent replay)
  const timestamp = payload.data.timestamp || Date.now();
  const age = Date.now() - timestamp;
  if (age > 3600000) return false;  // 1 hour max

  return true;
}
```

**Action Required:**
- [ ] Contact BibPay support for IP whitelist
- [ ] Implement IP whitelist validation
- [ ] Or confirm if HMAC/signature supported

---

#### Issue 2: Wrong HTTP Status Codes

**Location:** `/backend/src/controllers/payment.controller.ts:25`

**Current Code:**
```typescript
return res.status(200).json({ success: false, message: error.message });
```

**Problem:**
- Returns HTTP 200 (OK) on validation errors
- Should return 400 (Bad Request) or 422 (Unprocessable Entity)
- Breaks REST conventions
- Client-side error handling may fail
- Idempotency checks unreliable

**Intent (from commit 013c567):**
```
fix(payment): surface exact bibpay error msg and return 200 on deposit fail
```

**Question:** Why 200 status on error?
- Seems intentional, not accidental
- May be for compatibility with frontend expectations
- Or to allow detailed error messages without re-trying

**Recommended Fix:**
```typescript
// Option 1: Keep 200 but document why
return res.status(200).json({
  success: false,
  message: error.message,
  code: 'DEPOSIT_FAILED'  // Add error code for client to parse
});

// Option 2: Use proper HTTP codes
if (error.message.includes('Invalid')) {
  return res.status(422).json({ success: false, message: error.message });
} else {
  return res.status(500).json({ success: false, message: error.message });
}

// Option 3: Hybrid approach
return res.status(error.statusCode || 400).json({
  success: false,
  message: error.message
});
```

---

#### Issue 3: Payout Endpoint Not Confirmed

**Location:** `/backend/src/services/payment/providers/BibPayProvider.ts:123`

**Code:**
```typescript
// Assuming /payout endpoint exists for BibPay. If not, this will fail 404.
const response = await axios.post(`${this.baseUrl}/payout`, payload, { ... });
```

**Risk:** 🔴 **CRITICAL**
- Withdrawal feature will crash if endpoint doesn't exist
- No error handling for 404
- Users won't be able to withdraw
- Will return 404 error instead of friendly message

**Required Action:**
- [ ] Confirm `/payout` endpoint exists with BibPay
- [ ] Test endpoint in sandbox/staging
- [ ] Add proper error handling for 404:

```typescript
try {
  const response = await axios.post(`${this.baseUrl}/payout`, payload, { ... });
  // ... handle response
} catch (error: any) {
  if (error.response?.status === 404) {
    // Endpoint doesn't exist
    return {
      success: false,
      message: 'Payout endpoint not available. Contact support.',
      rawResponse: error.response?.data
    };
  }
  // ... other error handling
}
```

---

### 🟠 IMPORTANT ISSUES

#### Issue 4: Incomplete Bank Code Mapping

**Location:** `/backend/src/services/payment/providers/BibPayProvider.ts:201-212`

**Current:** Only 6 banks hardcoded
```typescript
const map = {
  'kbank': '004',
  'scb': '014',
  'ktb': '006',
  'bbl': '002',
  'gsb': '030',
  'bay': '025'
};
```

**Problem:**
- Thailand has 25+ banks
- Many banks not supported
- User with unsupported bank → Deposit fails silently
- Default to SCB ('014') may not be user's bank

**Solution:**
```typescript
// 1. On server startup, fetch bank list
async initBankList() {
  const bankList = await this.getBankList();
  // Cache it
  this.bankCache = bankList;

  // Build dynamic map
  this.bankMap = new Map(
    bankList.data.map(b => [
      b.bankName.toLowerCase(),
      b.bankCode
    ])
  );
}

// 2. Use dynamic mapping
private mapBankCode(bankName: string): string | null {
  if (!bankName) return null;

  // Try exact match first
  const normalized = bankName.toLowerCase();
  if (this.bankMap.has(normalized)) {
    return this.bankMap.get(normalized)!;
  }

  // Try fuzzy match
  for (const [cached, code] of this.bankMap) {
    if (cached.includes(normalized) || normalized.includes(cached)) {
      return code;
    }
  }

  return null;  // Let caller use default (SCB)
}

// 3. Update bank list periodically
setInterval(() => this.initBankList(), 6 * 3600 * 1000);  // Every 6 hours
```

---

#### Issue 5: Missing Admin Alert for Refund Failures

**Location:** `/backend/src/services/WalletService.ts:88`

**Code:**
```typescript
catch (refundErr) {
  console.error(`[CRITICAL] ❌ Refund ALSO failed! ${withdrawnAmount} THB stranded for User ${userId}!`, refundErr);
  // TODO: สร้าง alert/log ให้ admin ตรวจสอบด้วยมือ
}
```

**Scenario:**
1. User tries to swap agents
2. Withdraw from source agent succeeds ✅
3. Deposit to target agent FAILS ❌
4. Attempt refund to source agent FAILS ❌
5. Result: User's money is STRANDED! 💰

**Problem:**
- No admin notification happens
- Admin doesn't know money is stuck
- User's money lost in system
- Critical operational issue

**Solution:**
```typescript
// Create AlertLog table
prisma.alertLog.create({
  data: {
    type: 'CRITICAL',
    title: 'WALLET SWAP REFUND FAILED',
    message: `Refund of ${withdrawnAmount} THB to user ${userId} FAILED. Money may be stranded in agent ${sourceAgentId}.`,
    userId: userId,
    agentId: sourceAgentId,
    status: 'PENDING_REVIEW',
    relatedTransactionId: withdrawalTxId,
    actionRequired: true
  }
});

// Send email/SMS to admin
await notificationService.sendAdminAlert({
  type: 'CRITICAL',
  title: '⚠️ WALLET SWAP REFUND FAILED',
  body: `$${withdrawnAmount} stranded for user ${userId}. Manual review required.`,
  actionUrl: `/admin/transactions/${withdrawalTxId}`
});

// Create dashboard widget showing these alerts
```

---

#### Issue 6: HTTP 200 Status for Error Responses

Already documented above (Issue 2)

---

### 🟡 MINOR ISSUES

#### Issue 7: Preserving API Typos

**Fields:**
- `refferend` instead of `referenceId`
- `signatrure` instead of `signature`

**Assessment:** ✅ **Acceptable**
- Intentional, to match BibPay API
- Necessary for compatibility
- Documented in code comments

---

### 🟢 SECURITY BEST PRACTICES (Implemented)

✅ API key stored in database, not in code
✅ API key included in both header and payload
✅ HTTPS only (https://api.bibbyx.com)
✅ Transaction amounts validated before sending
✅ Reference IDs are unique per transaction
✅ Failed responses handled gracefully
✅ Error messages don't expose internal details
✅ Amount precision limited to 2 decimals

---

## Flow Diagrams

### 1. Deposit (Payin) Flow

```
User Deposit Flow:
─────────────────

1. User clicks "Deposit"
   ↓
2. Select bank and enter amount
   ↓
3. Backend: POST /api/payment/deposit
   ├─ Create pending transaction
   ├─ Call provider.createPayin()
   └─ Return QR code to UI
   ↓
4. Frontend: Display QR code
   ├─ User scans with banking app
   ├─ Transfer money to account
   └─ Wait for confirmation
   ↓
5. BibPay: Receive payment
   ├─ Generate receipt
   └─ Send webhook to our server
   ↓
6. Backend webhook (/api/webhooks/payment/bibpay)
   ├─ Verify webhook (❌ ISSUE: No verification)
   ├─ Find transaction by referenceId
   ├─ Update transaction status → COMPLETED
   ├─ Credit user balance
   └─ Transfer to game wallet (Betflix)
   ↓
7. Frontend: Detect balance update → Show success
```

**Payment Flow Diagram (Sequence):**

```
┌─────────┐             ┌──────────┐             ┌────────┐
│  User   │             │ Backend  │             │ BibPay │
└────┬────┘             └────┬─────┘             └───┬────┘
     │                       │                       │
     │ 1. Deposit Request     │                       │
     ├──────────────────────>│                       │
     │                       │                       │
     │                       │ 2. POST /payin        │
     │                       ├──────────────────────>│
     │                       │                       │
     │                       │<──── QR Code ──────── │
     │<────── QR Code ────────                       │
     │                       │                       │
     │ 3. Scan & Transfer    │                       │
     │─────────────────────────────────────────────>│
     │                       │                       │
     │                       │ 4. Webhook Request    │
     │                       │<──────────────────────│
     │                       │                       │
     │                       │ 5. Update Status +    │
     │                       │    Credit Balance     │
     │                       │                       │
     │<──── Balance Update ───│                       │
```

---

### 2. Auto-Withdrawal (Payout) Flow

```
User Withdrawal Flow:
──────────────────────

1. User clicks "Withdraw"
   ├─ Select bank account
   └─ Enter amount
   ↓
2. Backend: POST /api/payment/withdraw
   ├─ Verify balance ≥ amount
   ├─ IMMEDIATELY deduct balance (pessimistic)
   ├─ Mark transaction PENDING
   └─ If auto_withdraw enabled:
      ├─ Call provider.createPayout()
      └─ Send to BibPay
   ↓
3. BibPay: Process payout
   ├─ Initiate bank transfer
   ├─ Wait for confirmation
   └─ Send webhook on completion
   ↓
4. Backend: Receive webhook
   ├─ Update transaction status
   ├─ If SUCCESS → Balance already deducted ✅
   └─ If FAILED → Refund balance back to user
   ↓
5. User: Money received or refunded
```

**Note:** Balance is deducted immediately, before BibPay confirms!

**Edge Case - Refund Failure:**
```
Withdrawal Failed + Refund Failed:
────────────────────────────────────

1. Withdrawal call fails ❌
2. Attempt refund ❌
3. CRITICAL: Money stuck in limbo!
4. ⚠️ TODO: Create admin alert (not yet implemented)
```

---

### 3. Agent Swap with Wallet Transfer

```
When user switches game agent (e.g., Betflix → Nexus):
───────────────────────────────────────────────────────

Source Agent (has balance)
        ↓
    Withdraw ← (Money comes out)
        ↓
    Transfer money to Target Agent
        ↓
Target Agent
    Deposit ← (Money goes in)
        ↓
    User's balance on new agent

ISSUE: If deposit fails, refund might also fail!
→ Money stranded in source agent
→ No admin alert created
```

---

## Configuration

### Database Configuration

**Table:** `PaymentGateway`

**Example Entry:**
```javascript
{
  id: 1,
  code: 'bibpay',
  name: 'BibPay Thailand',
  config: {
    "apiKey": "bibpay_api_key_12345",
    "secretKey": "optional_secret_key",
    "apiEndpoint": "https://api.bibbyx.com/api/v1/mc",
    "callbackUrl": "https://api.check24m.com/api/webhooks/payment/bibpay",
    "canDeposit": true,
    "canWithdraw": true,
    "isAutoWithdraw": true,
    "maxAmount": 50000,
    "minAmount": 10
  },
  logo: "https://cdn.../bibpay-logo.png",
  isActive: true,
  sortOrder: 1,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01"
}
```

### Environment Variables

**`.env` file:**
```bash
# BibPay Configuration
BIBPAY_API_KEY=your_api_key_here
BIBPAY_API_ENDPOINT=https://api.bibbyx.com/api/v1/mc
BIBPAY_CALLBACK_URL=https://api.check24m.com/api/webhooks/payment/bibpay

# API Base URL
API_BASE_URL=https://api.check24m.com
BASE_URL=https://api.check24m.com

# Feature Flags
AUTO_DEPOSIT_ENABLED=true
AUTO_WITHDRAW_ENABLED=true
```

### TypeScript Configuration

**File:** `/backend/src/services/payment/providers/BibPayProvider.ts`

```typescript
interface BibPayConfig {
  apiKey: string;
  secretKey?: string;
  apiEndpoint?: string;
  callbackUrl?: string;
}

export class BibPayProvider implements IPaymentProvider {
  readonly code = 'bibpay';
  private config: BibPayConfig;
  private baseUrl = 'https://api.bibbyx.com/api/v1/mc';

  constructor(config: any) {
    this.config = config as BibPayConfig;
    if (this.config.apiEndpoint) {
      this.baseUrl = this.config.apiEndpoint.replace(/\/$/, '');
      if (!this.baseUrl.endsWith('/api/v1/mc')) {
        this.baseUrl += '/api/v1/mc';
      }
    }
  }

  // ... methods
}
```

---

## Troubleshooting

### Common Issues & Solutions

#### 🔴 "Invalid API key"

**Check:**
- [ ] API key correct in database config
- [ ] x-api-key header properly set
- [ ] signatrure field matches API key in payload
- [ ] API key hasn't expired
- [ ] No extra spaces/newlines around key

**Verify:**
```bash
curl -X POST https://api.bibbyx.com/api/v1/mc/balance \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"signatrure": "YOUR_API_KEY"}'
```

---

#### 🔴 "Invalid bank code"

**Check:**
- [ ] Bank code is 3 digits: `004`, `014`, etc.
- [ ] Bank code matches one from `/bank` endpoint
- [ ] No leading zeros or spaces
- [ ] Case matters (usually lowercase)

**Verify:**
```bash
# First, fetch bank list
curl -X POST https://api.bibbyx.com/api/v1/mc/bank \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"signatrure": "YOUR_API_KEY"}'

# Use code from response
```

---

#### 🔴 "Insufficient balance"

**Check:**
- [ ] Account balance > withdrawal amount
- [ ] Check current balance: `/balance` endpoint
- [ ] Account may need minimum balance reserve

**Verify:**
```bash
curl -X POST https://api.bibbyx.com/api/v1/mc/balance \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"signatrure": "YOUR_API_KEY"}'
```

---

#### 🟠 "Transaction not found" on webhook

**Check:**
- [ ] Reference ID matches what was sent during createPayin
- [ ] Reference ID stored correctly in database
- [ ] Check transaction table for matching record:

```sql
SELECT * FROM "Transaction"
WHERE "referenceId" = 'PAYIN_1704067200123_42'
OR "externalId" = 'TXN_2024_001234';
```

---

#### 🟠 QR code not displaying

**Check:**
- [ ] QR code field returned (check qrcode, qr_code, qrCode, qr, image, qr_image)
- [ ] Format is correct:
  - Base64: `data:image/png;base64,...`
  - URL: `https://...` or `http://...`
- [ ] Frontend properly decodes and displays

**Verify:**
```typescript
// Check raw response
const response = await provider.createPayin(500, user, 'PAYIN_test_1');
console.log('Response:', response);
console.log('QR Code:', response.qrCode);
```

---

#### 🟡 Webhook not received

**Check:**
- [ ] `callbackUrl` correctly configured
- [ ] Callback URL is publicly accessible (not localhost)
- [ ] Webhook endpoint `/api/webhooks/payment/bibpay` exists
- [ ] Server logs for webhook hits:

```bash
# Check server logs
tail -f /var/log/app.log | grep "webhook"

# Or in app:
console.log('Webhook received:', payload);
```

**Test Webhook:**
```bash
curl -X POST http://localhost:3001/api/webhooks/payment/bibpay \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "data": {
      "transactionId": "TEST_TXN_123",
      "refferend": "PAYIN_test_1",
      "amount": 500.00,
      "depositAmount": 500.00
    }
  }'
```

---

#### 🟡 Payout endpoint returns 404

**Issue:** Endpoint `/payout` doesn't exist

**Solution:**
- [ ] Contact BibPay support to confirm endpoint URL
- [ ] May use different endpoint name (e.g., `/withdraw`, `/transfer`)
- [ ] May require different authentication

**Debug:**
```bash
curl -X POST https://api.bibbyx.com/api/v1/mc/payout \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "bankName": "Test",
    "bankNumber": "1234567890",
    "bankCode": "014",
    "amount": 100.00,
    "refferend": "TEST_PAYOUT_1",
    "signatrure": "YOUR_API_KEY"
  }'
```

---

#### 🟡 Bank code hardcoded values missing

**Issue:** User's bank not in hardcoded list

**Solution:**
- [ ] Implement dynamic bank list fetching (see bank section)
- [ ] Or add more banks to hardcoded map:

```typescript
const map = {
  'kbank': '004',
  'scb': '014',
  'ktb': '006',
  'bbl': '002',
  'gsb': '030',
  'bay': '025',
  // Add more here:
  'kkp': '023',    // Krungthai Panich
  'tmb': '011',    // TMB Bank
  'uob': '024',    // United Overseas Bank
  'icbc': '054',   // Industrial and Commercial Bank
  'dbs': '070',    // DBS Bank
  'tisco': '066',  // Tisco Bank
  'bnp': '073',    // BNP Paribas
  'citi': '017',   // Citibank
  'hsbc': '021',   // HSBC
  'mufg': '044',   // Bank of Tokyo-Mitsubishi
  'aeon': '037',   // AEON Bank
};
```

---

#### 🟡 Auto-withdrawal not triggering

**Check:**
- [ ] `auto_withdraw` feature enabled in SiteFeature table
- [ ] Payment gateway has `isAutoWithdraw: true`
- [ ] User has requested auto-withdrawal
- [ ] Server logs:

```bash
grep -i "auto.withdraw\|payout" /var/log/app.log
```

**Enable Manually:**
```sql
-- Enable auto-withdraw feature
UPDATE "SiteFeature"
SET "enabled" = true
WHERE "code" = 'auto_withdraw';

-- Verify
SELECT "code", "enabled" FROM "SiteFeature";
```

---

### Test Scripts

**Interactive BibPay Tester:** `/backend/scripts/test-bibpay.ts`

```bash
# Run deposit test
npm run tsx backend/scripts/test-bibpay.ts

# Output shows:
# - API endpoint used
# - Payload sent (with signature masked)
# - QR code received
# - Or error details
```

---

## Quick Reference

### Important Endpoints

```
POST /payin             → Generate deposit QR code
POST /payout            → Initiate withdrawal
POST /balance           → Get account balance
POST /transaction/check → Check transaction status
POST /bank              → Get supported banks
```

### Field Mapping

```
Internal                    →  API
───────────────────────────────────────
referenceId                 →  refferend (typo!)
signature (API key)         →  signatrure (typo!)
amount (decimal)            →  amount (2 decimals)
userBankName                →  bankName
userBankAccount             →  bankNumber
userBankCode                →  bankCode
```

### HTTP Headers (All Requests)

```
Content-Type: application/json
x-api-key: YOUR_API_KEY
```

### Common Status Flows

```
Deposit:
pending → completed → SUCCESS (balance credited)
pending → timeout → FAILED (no balance change)

Withdrawal:
pending → SUCCESS (balance already deducted)
pending → FAILED (balance refunded)
```

### Key Files

```
Implementation:
├── /backend/src/services/payment/providers/BibPayProvider.ts
├── /backend/src/services/payment.service.ts
├── /backend/src/controllers/payment.controller.ts
├── /backend/src/routes/webhook.routes.ts
└── /backend/scripts/test-bibpay.ts

Configuration:
├── /backend/prisma/schema.prisma (PaymentGateway model)
└── /backend/.env

Database:
└── "PaymentGateway" table (stores config JSON)
```

---

## Checklist: Before Going to Production

### Pre-Production Checklist

- [ ] Test `/payin` endpoint in staging environment
- [ ] Test `/payout` endpoint (confirm it exists!)
- [ ] Receive and process test webhook successfully
- [ ] Verify bank code exhaustive against local user banks
- [ ] Configure IP whitelist with BibPay (for webhook security)
- [ ] Implement webhook signature verification
- [ ] Change HTTP error responses to 4xx (if intentional 200 to be documented)
- [ ] Implement admin alert system for critical failures
- [ ] Load test balance checks (no rate limiting)
- [ ] Test error scenarios (invalid bank, insufficient balance, network errors)
- [ ] Document callback URL and webhook IP requirements
- [ ] Create runbook for manual transaction reconciliation
- [ ] Set up monitoring/alerting on failed transactions
- [ ] Train support team on troubleshooting steps
- [ ] Create transaction logs and audit trails
- [ ] Backup API key securely in production secret manager

---

## Support & Contact

**BibPay Support:**
- Email: support@bibbyx.com
- API Docs: https://www.bibbyx.com/api
- Support Hours: 9 AM - 6 PM (Thai Time)

**SPIN2UP Team:**
- Payment Processor: [Your Name]
- Last Updated: 2026-02-28

---

**End of Documentation**

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-28 | Initial complete documentation | Claude Code |
| | | Added security analysis | |
| | | Webhook flow diagrams | |
| | | Troubleshooting guide | |
