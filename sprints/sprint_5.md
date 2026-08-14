# Sprint 5 Detailed Execution Plan
**Module:** Production Deployment, Security Hardening, CloudWatch & E2E Testing  
**Target Duration:** Days 9–10  
**Prerequisites:** Completed Sprints 1–4, Production AWS EC2 & RDS Instance  

---

## 1. Objective & Scope
Deploy Mediguide X to an AWS EC2 instance in `us-west-2`, configure Nginx reverse proxy with TLS/HTTPS encryption, establish CloudWatch logging and metrics dashboards, execute security audits, and perform end-to-end acceptance testing across all PRD user journeys.

---

## 2. Technical Architecture & Deployment Topology

```
+-----------------------------------------------------------------------------------+
| AWS Cloud (ap-south-1: Mumbai)                                                    |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | EC2 Instance (t3.medium - Ubuntu 24.04 LTS)                                |  |
|  |                                                                             |  |
|  |  [ Internet: Port 80 / 443 ]                                               |  |
|  |             │                                                               |  |
|  |             ▼                                                               |  |
|  |    Nginx Reverse Proxy (SSL/TLS Certbot)                                    |  |
|  |     ├── /           ──> Serves Static Frontend Build (/var/www/dist)      |  |
|  |     └── /api/v1/    ──> Proxies to Uvicorn (127.0.0.1:8000)                |  |
|  |                             │                                               |  |
|  |                             ▼                                               |  |
|  |                    FastAPI Systemd Service                                  |  |
|  |                    (CloudWatch Agent Log Exporter)                          |  |
|  +-----------------------------┬──────────────────────┬────────────────────────+  |
|                                │                      │                           |
|                                ▼                      ▼                           |
|                    Amazon RDS PostgreSQL      Amazon S3 Bucket                    |
|                    (KMS Encrypted)            (KMS Encrypted)                     |
|                                │                      │                           |
|                                +----------┬-----------+                           |
|                                           │                                       |
|                                           ▼                                       |
|                                  Amazon Bedrock (Nova)                            |
+-----------------------------------------------------------------------------------+
```

---

## 3. Step-by-Step Task Breakdown

### Task 5.1: AWS Infrastructure Provisioning & EC2 Configuration
1. Provision EC2 `t3.medium` (2 vCPU, 4GB RAM) with Ubuntu 24.04 LTS in `ap-south-1`.
2. Assign Elastic IP and attach IAM Role with least-privilege policies:
   - `AmazonBedrockFullAccess` (or restricted inline policy for `bedrock:InvokeModel`).
   - `AmazonS3CrudPolicy` for bucket `mediguide-x-patient-docs-mumbai`.
   - `CloudWatchAgentServerPolicy`.
3. Configure Security Group Rules:
   - Inbound: Port 80 (HTTP), Port 443 (HTTPS), Port 22 (SSH restricted to admin IP).
   - Outbound: All traffic.
4. Setup FastAPI Systemd Service (`/etc/systemd/system/mediguide-backend.service`):
   ```ini
   [Unit]
   Description=Mediguide X FastAPI Application
   After=network.target

   [Service]
   User=ubuntu
   WorkingDirectory=/home/ubuntu/mediguide-x/backend
   ExecStart=/home/ubuntu/mediguide-x/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

### Task 5.2: Nginx Reverse Proxy & TLS/HTTPS Configuration
1. Install Nginx & Certbot: `sudo apt update && sudo apt install nginx certbot python3-certbot-nginx -y`.
2. Configure `/etc/nginx/sites-available/mediguide`:
   ```nginx
   server {
       server_name mediguide-x.example.com;

       location / {
           root /var/www/mediguide/dist;
           try_files $uri $uri/ /index.html;
       }

       location /api/v1/ {
           proxy_pass http://127.0.0.1:8000/api/v1/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Issue TLS Certificate: `sudo certbot --nginx -d mediguide-x.example.com`.

### Task 5.3: AWS CloudWatch Monitoring & Alarm Setup
1. Install CloudWatch Agent on EC2:
   - Configure `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json` to tail `/var/log/nginx/access.log`, `/var/log/nginx/error.log`, and FastAPI application logs.
2. Create CloudWatch Dashboard `MediguideX-OpsDashboard`:
   - Widget 1: HTTP API 2xx / 4xx / 5xx request volume.
   - Widget 2: Bedrock Invocation Count & Token Consumption (Nova Lite vs Nova Pro).
   - Widget 3: EC2 CPU Utilization & Memory Usage.
3. Configure CloudWatch Metric Alarm `MediguideX-HighErrorRateAlarm`:
   - Trigger: HTTP 5xx error percentage > 5% over 5-minute evaluation period.
   - Action: Send SNS Email Alert to system administrator.

### Task 5.4: End-to-End User Journey Acceptance Verification
Execute automated or manual verification script testing all 8 core PRD user journeys:
1. **Journey 1 (Sign Up / Onboard):** Register new email, verify Cognito user creation and DB sync.
2. **Journey 2 (Upload & View Report):** Upload `CBC_Jan2026.pdf` to S3 via presigned URL; confirm record entry.
3. **Journey 3 (Medical Conversation):** Query symptom "fever and headache"; verify Nova Lite response in < 5s with medical disclaimer.
4. **Journey 4 (Lab Report Explanation):** Ask AI to explain uploaded CBC; verify extracted values referenced in response.
5. **Journey 5 (Prescription Explanation):** Enter medicine "Metformin 500mg"; verify side-effects and dosage advice.
6. **Journey 6 (Care Plan Generation):** Click "Generate Care Plan"; verify Nova Pro outputs structured JSON care plan.
7. **Journey 7 (Follow-up):** Ask follow-up question; verify context continuity across messages.
8. **Journey 8 (Data Management):** Switch family member profiles; verify records and chat history update correctly.

---

## 4. Input & Output Specs and Validation Rules

### Production Health Check Endpoint: `GET /api/v1/health`
- **Request Headers:** None
- **Output Pydantic Schema (`HealthStatusResponse`):**
  ```python
  class HealthStatusResponse(BaseModel):
      status: Literal["healthy", "degraded", "unhealthy"]
      database_connected: bool
      s3_accessible: bool
      bedrock_accessible: bool
      timestamp: datetime
  ```
- **Validation Rules:**
  - Performs active `SELECT 1` DB ping.
  - Performs lightweight S3 `head_bucket` check.
  - Returns HTTP `200 OK` if all services connected; returns HTTP `503 Service Unavailable` if database or core AWS services disconnected.

### Security Header Validations
Production Nginx responses must include mandatory security headers:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self';`

---

## 5. Acceptance Criteria & Verification Steps

1. **Production Health Check Verification:**
   ```bash
   curl -i https://mediguide-x.example.com/api/v1/health
   ```
   *Pass Criteria:* Returns `200 OK` with JSON `status: "healthy"`, `database_connected: true`, `bedrock_accessible: true`.

2. **Security Headers Verification:**
   ```bash
   curl -I https://mediguide-x.example.com
   ```
   *Pass Criteria:* Headers contain HSTS, X-Frame-Options, X-Content-Type-Options, and valid SSL/TLS certificate chain.

3. **CloudWatch Dashboard & Metric Verification:**
   - Log into AWS Console -> CloudWatch -> Dashboards -> `MediguideX-OpsDashboard`.
   *Pass Criteria:* Dashboard displays active log streams, API request counts, and Bedrock token usage graphs.

4. **E2E Journey Verification Suite:**
   ```bash
   pytest tests/test_e2e_journeys.py -v
   ```
   *Pass Criteria:* 100% of test scenarios corresponding to PRD Journeys 1–8 pass cleanly against the deployed environment.
