# Oracle Cloud Free Tier — Account Setup Guide

## What You Get (Always Free, Forever)
- **4 ARM CPUs + 24 GB RAM** (Ampere A1 Flex)
- **200 GB** block storage
- **10 TB/month** outbound data transfer
- **2 Virtual Cloud Networks**
- **1 Load Balancer** (10 Mbps)

> This is NOT a trial. These resources are free forever as long as your account is active.

---

## Step-by-Step Account Creation

### Step 1: Go to Signup Page
- Open: **https://signup.oraclecloud.com/**
- Click **"Start for free"**

### Step 2: Email Verification
- Enter your **email address**
- Check your inbox for Oracle verification email
- Click the **verification link** in the email
- This will redirect you back to the signup form

### Step 3: Account Details

Fill in the following:

| Field | What to Enter |
|-------|---------------|
| **Country** | Select your country (e.g., India) |
| **First Name** | Your first name |
| **Last Name** | Your last name |
| **Cloud Account Name** | Choose a unique name (e.g., `kyf-team-prod`) |

> **IMPORTANT: Save your Cloud Account Name somewhere safe!**
> This is your login identifier. Without it, you cannot sign in later.
> Your login URL will be: `https://cloud.oracle.com/?oraclecloud=<your-cloud-account-name>`

### Step 4: Set Password
- Create a strong password (min 8 chars, upper+lower+number+special)
- **Save this password** — you'll need it to log in

### Step 5: Home Region Selection

| If your users are in... | Select Region |
|------------------------|---------------|
| India | **India South (Hyderabad)** or **India West (Mumbai)** |
| US | **US East (Ashburn)** or **US West (Phoenix)** |
| Europe | **Germany Central (Frankfurt)** |

> **WARNING: Home Region is PERMANENT. You cannot change it later.**
> Always Free resources ONLY work in your Home Region.
> Pick the region closest to your users.

### Step 6: Billing Address

Enter your address details:
- **Address Line 1**: Your street address
- **City, State, ZIP/Postal Code**
- **Phone Number**

> **CRITICAL: This address MUST match the address registered with your bank/credit card.**
> Oracle verifies this. If there's a mismatch, the signup will fail.

### Step 7: Add Credit Card

- Click **"Add payment verification method"**
- Enter your credit card details:
  - Card Number
  - Expiry Date
  - CVV
  - Name on Card

**Important things to know:**
- Oracle will charge **$1 (or equivalent)** as a verification hold
- This charge is **refunded automatically** within a few days
- Your card will **NOT be charged** unless you manually upgrade to a paid account
- **Any Visa/Mastercard** works (credit or debit)
- The **name and address on the card must match** what you entered in Step 6
- If verification fails, double-check that your billing address matches your bank records

### Step 8: Agreement & Submit
- Check the **Terms and Conditions** checkbox
- Click **"Start my free trial"**
- Wait for account provisioning (usually 1-5 minutes)

### Step 9: First Login
- Go to: **https://cloud.oracle.com/**
- Enter your **Cloud Account Name** (from Step 3)
- Click **Next**
- Enter your **email** and **password**
- You're in!

---

## After Account Creation

### Install OCI CLI (on your local machine)

**Windows (PowerShell as Admin):**
```powershell
Set-ExecutionPolicy RemoteSigned
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.ps1'))"
```

**Linux/Mac:**
```bash
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"
```

### Configure OCI CLI

Run:
```bash
oci setup config
```

It will ask for:

| Prompt | Where to Find It |
|--------|-------------------|
| **User OCID** | OCI Console → Profile icon (top-right) → My Profile → copy OCID |
| **Tenancy OCID** | OCI Console → Profile icon → Tenancy → copy OCID |
| **Region** | The home region you selected (e.g., `ap-hyderabad-1` or `ap-mumbai-1`) |
| **API Key** | It will auto-generate a key pair. Say **Yes** to generate new keys |

After key generation:
1. Copy the **public key** content shown in terminal
2. Go to OCI Console → Profile → My Profile → **API Keys** → **Add API Key**
3. Paste the public key → Click **Add**

### Verify Setup
```bash
oci iam availability-domain list
```
If you see a JSON response with availability domains, you're all set!

---

## Quick Reference

| What | Value |
|------|-------|
| Login URL | https://cloud.oracle.com/ |
| Cloud Account Name | _(save from Step 3)_ |
| Console URL | https://cloud.oracle.com/?oraclecloud=YOUR_CLOUD_NAME |
| Region (India) | `ap-hyderabad-1` or `ap-mumbai-1` |
| Free Tier Docs | https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm |

---

## Common Issues

**"Out of host capacity" error when creating instance:**
- ARM instances are popular. Try at off-peak hours (early morning IST)
- Try a different Availability Domain if your region has multiple

**Credit card verification failed:**
- Make sure billing address matches your bank address exactly
- Try a different card (Visa/Mastercard preferred)
- Some virtual/prepaid cards may not work

**Forgot Cloud Account Name:**
- Check the welcome email from Oracle — it contains your cloud account name
- There's no way to recover it from the login page, so always save it

**"Your account is being provisioned":**
- Wait 5-10 minutes. Sometimes it takes up to 30 minutes
- Check email for a "Your account is ready" confirmation
