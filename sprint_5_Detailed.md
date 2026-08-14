# Sprint 5 Detailed Execution Plan: Deployment & Production Readiness

This document breaks down Sprint 5 into clear, actionable tasks divided between the AI Assistant (me) and the Developer (you). 

Sprint 5 focuses on taking the Mediguide X application to production by deploying it on an AWS EC2 instance, securing it with Nginx and SSL/HTTPS, setting up AWS CloudWatch monitoring, and performing End-to-End (E2E) testing.

---

## 🤖 AI Assistant Tasks (What I will do)

I will handle the application-level code additions and generate the exact configuration files you need for the server.

1. **Implement Production Health Check Endpoint**
   - **Task:** Create the `GET /api/v1/health` endpoint in FastAPI.
   - **Details:** I will write the code to return the `HealthStatusResponse` schema. This will include active database queries (`SELECT 1`), S3 bucket accessibility checks (`head_bucket`), and Bedrock availability checks.
2. **Prepare Systemd Service Configuration**
   - **Task:** Generate the exact `/etc/systemd/system/mediguide-backend.service` file content.
   - **Details:** This config ensures your FastAPI Uvicorn server runs continuously in the background and restarts automatically on failure.
3. **Prepare Nginx Reverse Proxy Configuration**
   - **Task:** Write the complete Nginx server block configuration.
   - **Details:** I will provide the config to route `/` to your compiled React static build and proxy `/api/v1/` to Uvicorn. I will also inject all mandatory **Security Headers** (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Content-Security-Policy`) as strictly required by the sprint plan.
4. **Write E2E Test Scenarios (Optional)**
   - **Task:** If requested, I can write the `pytest` automated script (`tests/test_e2e_journeys.py`) to verify the 8 core PRD user journeys.

---

## 👨‍💻 Developer Tasks (What you need to perform)

Since these tasks involve the AWS Management Console and SSH access to your live server, you will need to execute them manually. I will guide you through each step.

### Step 1: AWS Infrastructure Setup (AWS Console)
1. **EC2 Provisioning:** Launch a `t3.micro` EC2 instance with ubuntu-noble-24.04-amd64 in the us-west-2` (Oregon) region.
2. **Networking:** Allocate an Elastic IP address and associate it with your EC2 instance. Ensure you have a registered domain name pointing to this IP.
3. **Security Groups:** Configure inbound rules to allow:
   - Port `80` (HTTP)
   - Port `443` (HTTPS)
   - Port `22` (SSH - ideally restricted to your own IP address)
4. **IAM Roles:** Create an IAM Role with the following policies and attach it to the EC2 instance:
   - `AmazonBedrockFullAccess` (or restricted to `bedrock:InvokeModel`)
   - `AmazonS3CrudPolicy` (scoped to your patient docs bucket)
   - `CloudWatchAgentServerPolicy`

### Step 2: Server Setup (SSH into EC2)
1. **Transfer Files:** Git clone or securely copy the Mediguide X project files to `/home/ubuntu/mediguide-x/` on your server.
2. **Install Dependencies:**
   - Install Python, Node.js, and Nginx.
   - Build the frontend (`npm install && npm run build`) and copy the `dist` folder to `/var/www/mediguide/dist`.
   - Setup the Python backend virtual environment and install backend dependencies (`pip install -r requirements.txt`).

### Step 3: Deployment Configurations
1. **Backend Service:** Create the systemd file using the configuration I will provide, then start it (`sudo systemctl enable --now mediguide-backend`).
2. **Nginx Proxy:** Place the Nginx configuration I will provide into `/etc/nginx/sites-available/mediguide`, enable it, and restart Nginx.
3. **SSL Certificate:** Run `sudo certbot --nginx -d your-domain.com` to secure the application with HTTPS encryption.

### Step 4: Monitoring Setup (AWS Console & Server)
1. **CloudWatch Agent:** Install and configure the CloudWatch agent on the EC2 instance to tail Nginx access/error logs and application logs.
2. **Dashboards & Alarms:** In the AWS Console, create the `MediguideX-OpsDashboard` and the `MediguideX-HighErrorRateAlarm` (triggering an SNS email alert if HTTP 5xx errors exceed 5%).

### Step 5: Acceptance Testing
1. Execute the manual or automated End-to-End user journeys (Sign Up, Report Upload, Medical Chat, Follow-up, Data Management, etc.) on your live domain to verify 100% production functionality.

---

## 🚀 How to Proceed

When you are ready, simply say: **"Let's start Sprint 5. Please write the health endpoint and configuration files."** 
Once I provide the code and configuration templates, you can begin the manual AWS Console setup!
