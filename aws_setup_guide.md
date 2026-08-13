# Comprehensive AWS Setup Guide (Sprints 1–5)

This guide details all the AWS infrastructure you need to configure to complete the entire Mediguide X project (Sprints 1 through 5). 

Please ensure you are working in the **`us-west-2` (Oregon)** region for consistency (unless deploying EC2 in `ap-south-1` as per the Sprint 5 plan; in that case, adjust accordingly, but it's recommended to keep everything in `us-west-2` to reduce cross-region latency).

---

## 1. Amazon Cognito (User Authentication - Sprint 2 & 4)
We need a User Pool to handle user registration, login, and JWT token issuance.

**Steps:**
1. Go to the **Amazon Cognito** console.
2. Click **Create user pool**.
3. **Configure sign-in experience:** 
   - Provider types: **Cognito user pool**.
   - Cognito user pool sign-in options: **Email**.
   - Click Next.
4. **Configure security requirements:**
   - Password policy: Choose "Cognito defaults".
   - Multi-factor authentication (MFA): Select **No MFA**.
   - User account recovery: Enable self-service recovery via Email.
   - Click Next.
5. **Configure sign-up experience:**
   - Leave defaults (enable self-registration). 
   - Under Required attributes, choose `name` (we map this to `full_name` in our backend).
   - Click Next.
6. **Configure message delivery:**
   - Email provider: Choose **Send email with Cognito**.
   - Click Next.
7. **Integrate your app:**
   - User pool name: `Mediguide-User-Pool`.
   - Initial app client name: `Mediguide-Web-App`.
   - Client secret: **Do not generate a client secret** (Web apps like React/Vite should not use client secrets).
   - Click Next, then **Create user pool**.

**Data Needed for `.env`:**
* Note the **User Pool ID** (e.g., `us-west-2_xxxxxxxxx`).
* Note the **Client ID** (from the App integration -> App clients tab).

---

## 2. Amazon S3 (Document Storage - Sprint 2, 3 & 4)
We need a secure bucket to store medical reports (PDFs, Images).

**Steps:**
1. Go to the **Amazon S3** console.
2. Click **Create bucket**.
3. **Bucket name:** `mediguide-patient-docs-YOURNAME` (must be globally unique).
4. **AWS Region:** `us-west-2`.
5. **Block Public Access settings:** Keep **Block all public access** checked. 
6. **Default encryption:** Enable Server-side encryption (Amazon S3 managed keys).
7. Click **Create bucket**.

**CORS Configuration (Required for Frontend Uploads):**
1. Click on the bucket you just created -> **Permissions** tab.
2. Scroll to **Cross-origin resource sharing (CORS)** and click **Edit**.
3. Paste the following JSON:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedOrigins": ["*"], 
        "ExposeHeaders": ["ETag"]
    }
]
```
4. Click **Save changes**.

**Data Needed for `.env`:**
* Note the exact **Bucket Name**.

---

## 3. Amazon Bedrock (AI Model Access - Sprint 2 & 3)
We need to enable the **Amazon Nova Lite** (for chat) and **Amazon Nova Pro** (for document analysis/care plans) models.

**Steps:**
1. Go to the **Amazon Bedrock** console in `us-west-2`.
2. Click on **Model access** (left navigation pane).
3. Click **Manage model access** (or "Modify model access").
4. Scroll to the **Amazon** provider section.
5. Check the box next to **Nova Lite** AND **Nova Pro**.
6. Click **Save changes** / **Request model access**. 
7. Wait until the status changes to "Access granted".

---

## 4. AWS IAM Credentials (For Local Backend Access - Sprints 1-4)
Your local FastAPI backend needs permission to talk to S3 and Bedrock. 

**Steps:**
1. Go to the **IAM** console -> **Users** -> **Create user**.
2. Name: `mediguide-backend-svc`. Click Next.
3. Set permissions: Choose **Attach policies directly**.
4. Attach these two policies:
   - `AmazonS3FullAccess` 
   - `AmazonBedrockFullAccess`
5. Click Next, then **Create user**.
6. Click the newly created user -> **Security credentials** tab.
7. Click **Create access key** -> Choose "Local code" -> Click Next -> **Create access key**.

**Data Needed for `.env`:**
* Note the **Access key** and **Secret access key**.

---

## 5. Amazon EC2 & Production IAM Role (Deployment - Sprint 5)
In Sprint 5, we will deploy the app to an EC2 instance. Instead of using hardcoded Access Keys, the EC2 instance will use an IAM Role.

**Part A: Create the EC2 IAM Role**
1. Go to **IAM** console -> **Roles** -> **Create role**.
2. Trusted entity type: **AWS service** -> Use case: **EC2**. Click Next.
3. Attach policies:
   - `AmazonS3FullAccess`
   - `AmazonBedrockFullAccess`
   - `CloudWatchAgentServerPolicy` (For logs & metrics)
4. Click Next. Role name: `Mediguide-EC2-Role`. Click **Create role**.

**Part B: Provision the EC2 Instance**
1. Go to the **Amazon EC2** console.
2. Click **Launch instances**.
3. Name: `Mediguide-Production-Server`.
4. OS Image (AMI): **Ubuntu Server 24.04 LTS** (or 22.04 LTS).
5. Instance type: `t3.medium`.
6. Key pair: Create a new key pair (e.g., `mediguide-key.pem`) and download it securely so you can SSH into the server later.
7. Network settings:
   - Check **Allow SSH traffic from** (restrict to your IP).
   - Check **Allow HTTP traffic from the internet**.
   - Check **Allow HTTPS traffic from the internet**.
8. Advanced details:
   - IAM instance profile: Select `Mediguide-EC2-Role`.
9. Click **Launch instance**.
10. Once running, click on the instance and allocate/associate an **Elastic IP address** so your public IP doesn't change when the server restarts.

---

## 6. Amazon SNS (For CloudWatch Alarms - Sprint 5)
To receive email alerts if the server has issues (e.g., high 5xx error rate).

**Steps:**
1. Go to the **Amazon SNS** console -> **Topics**.
2. Click **Create topic** -> Type: **Standard**.
3. Name: `Mediguide-Alerts`. Click Create topic.
4. Click **Create subscription**.
5. Protocol: **Email**. Endpoint: `your-email@example.com`.
6. Click Create subscription.
7. Check your email inbox and click the AWS confirmation link to verify the subscription.

---

## Final `.env` File Setup (Local Development)
Update your local `F:\AI_Chat\backend\.env` file:

```ini
# Database
DATABASE_URL=postgresql+psycopg://...

# AWS Configuration
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Cognito
AWS_COGNITO_USER_POOL_ID=your_user_pool_id
AWS_COGNITO_APP_CLIENT_ID=your_client_id

# S3
AWS_S3_BUCKET_NAME=mediguide-patient-docs-YOURNAME
```
*(During Sprint 5 deployment, the `.env` on the EC2 server will NOT need `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` because it will use the `Mediguide-EC2-Role` automatically).*
