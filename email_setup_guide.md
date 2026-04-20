# Email Service Setup Guide (Nodemailer)

This application uses **Nodemailer** for sending transactional emails (OTP verification, password recovery, and order confirmations).

## 1. Prerequisites
- A Gmail account.
- **2-Step Verification** MUST be enabled in your Google Account.
- An **App Password** generated from Google.

## 2. Generating an App Password
1. Go to your [Google Account Settings](https://myaccount.google.com/).
2. Navigate to **Security**.
3. Under "How you sign in to Google," select **2-Step Verification**.
4. Scroll to the bottom and select **App Passwords**.
5. Enter a name (e.g., "InfinityTech") and click **Create**.
6. Copy the **16-character code** (this is your `EMAIL_PASS`).

## 3. Environment Variables
Update your `.env` file with the following:

```bash
EMAIL_USER = your-email@gmail.com
EMAIL_PASS = "xxxx xxxx xxxx xxxx"  # Your 16-digit App Password
NODE_ENV = development              # Use 'production' to send real emails
```

## 4. Development vs Production
- **Development Mode (`NODE_ENV=development`)**: 
  - Real emails are **logged to the console** (Terminal) as a fallback.
  - This prevents cluttering your inbox during testing.
  - Note: It will still attempt to connect to Gmail, but suppresses the actual delivery unless the connection fails.
- **Production Mode (`NODE_ENV=production`)**: 
  - Real emails are sent to the recipient's inbox.

## 5. File Structure
- **Service**: `services/emailService.js`
- **Callers**:
  - `controllers/user/userControllers.js` (Signup/OTP)
  - `controllers/user/password.js` (Forgot Password)
  - `controllers/user/checkOutController.js` (Order Confirmation)
