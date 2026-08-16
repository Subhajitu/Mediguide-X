# Mediguide-X Production Deployment Guide

## Prerequisites

- EC2 instance (t3.micro) running Ubuntu 22.04 LTS
- EC2 IAM instance role with permissions: `bedrock:InvokeModel`, `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `cognito-idp:InitiateAuth`, `cognito-idp:SignUp`, `cognito-idp:AdminConfirmSignUp`
- RDS PostgreSQL 16 instance (existing, accessible from EC2 security group)
- S3 bucket for medical documents (existing)
- Amazon Cognito User Pool and App Client (existing)
- Domain name with DNS pointed to EC2 Elastic IP
- TLS certificate (Let's Encrypt / ACM)

---

## 1. Environment Variables

On the EC2 instance, create `/home/ubuntu/mediguide-x/backend/.env`:

```
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://user:password@rds-endpoint:5432/mediguide
ALLOWED_ORIGINS=["https://your-domain.com"]
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
AWS_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_COGNITO_APP_CLIENT_SECRET=                     # leave blank if app client has no secret
AWS_S3_BUCKET_NAME=mediguide-documents-prod
AI_HISTORY_TURNS=3
```

**Do not set `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`** — the EC2 IAM instance role provides credentials automatically.

Create `/var/www/mediguide/.env.production` for the frontend build:

```
VITE_API_BASE_URL=https://your-domain.com/api/v1
```

---

## 2. Pre-Deployment Checklist

Verify these before proceeding:

- [ ] `ENVIRONMENT` is `production` (not `development`)
- [ ] `AWS_COGNITO_USER_POOL_ID` is set (disables mock token backdoor)
- [ ] `ALLOWED_ORIGINS` contains only the real production domain
- [ ] No `.env` file contains `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`
- [ ] `VITE_API_BASE_URL` does not contain `localhost`
- [ ] Nginx `server_name` is set to real domain
- [ ] TLS is configured before enabling HSTS

---

## 3. Pull Code

```bash
cd /home/ubuntu/mediguide-x
git pull origin main
```

---

## 4. Backend: Install Dependencies

```bash
cd /home/ubuntu/mediguide-x/backend
source venv/bin/activate
pip install -r requirements.txt
```

---

## 5. Database Migrations

Run all pending Alembic migrations. The migration chain is:

```
6f34ec737a6d  →  a1b2c3d4e5f6  →  b2c3d4e5f6a7
(initial schema)  (FK indexes)    (document_s3_key on chat_messages)
```

```bash
cd /home/ubuntu/mediguide-x/backend
source venv/bin/activate
alembic upgrade head
```

Verify the applied revisions:

```bash
alembic current
# Expected: b2c3d4e5f6a7 (head)
```

**Rollback if needed:**
```bash
alembic downgrade -1   # one step back
alembic downgrade base # full rollback (data loss — use only in emergency)
```

---

## 6. Backend: Restart Service

Install or update the systemd unit:

```bash
sudo cp /home/ubuntu/mediguide-x/deploy/mediguide-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart mediguide-backend
sudo systemctl enable mediguide-backend
sudo systemctl status mediguide-backend
```

Confirm the API is responding:

```bash
curl -s http://127.0.0.1:8000/api/v1/health | python3 -m json.tool
```

---

## 7. Frontend: Build

```bash
cd /home/ubuntu/mediguide-x
npm ci --production=false
VITE_API_BASE_URL=https://your-domain.com/api/v1 npm run build
```

Copy the build output to the Nginx document root:

```bash
sudo mkdir -p /var/www/mediguide
sudo cp -r dist/* /var/www/mediguide/dist/
sudo chown -R www-data:www-data /var/www/mediguide
```

---

## 8. Nginx: Configure and Reload

Install or update the Nginx config:

```bash
sudo cp /home/ubuntu/mediguide-x/deploy/mediguide.nginx /etc/nginx/sites-available/mediguide
sudo ln -sf /etc/nginx/sites-available/mediguide /etc/nginx/sites-enabled/mediguide
sudo rm -f /etc/nginx/sites-enabled/default
```

Edit `/etc/nginx/sites-available/mediguide`:
- Replace `your-domain.com` with the real domain
- Add TLS (port 443) configuration with certificate paths
- Move `Strict-Transport-Security` header to the HTTPS server block only

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 9. TLS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo systemctl reload nginx
```

Certbot auto-renewal is configured by the installer. Verify:

```bash
sudo certbot renew --dry-run
```

---

## 10. IAM Instance Role — Verify Credential Chain

Confirm boto3 resolves credentials from the instance role (no hardcoded keys):

```bash
cd /home/ubuntu/mediguide-x/backend
source venv/bin/activate
python3 -c "import boto3; print(boto3.client('sts').get_caller_identity()['Arn'])"
# Expected: arn:aws:sts::ACCOUNT:assumed-role/ROLE-NAME/i-INSTANCEID
```

---

## 11. Cognito — Verify Mock Token Backdoor is Closed

With `ENVIRONMENT=production` and `AWS_COGNITO_USER_POOL_ID` set, the mock token path in `security.py` is inactive. Verify:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer mock-token-test@example.com" \
  https://your-domain.com/api/v1/auth/me
# Expected: 401 (not 200)
```

---

## 12. CORS — Verify Allowlist

```bash
curl -s -I -X OPTIONS https://your-domain.com/api/v1/health \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
| grep -i "access-control-allow-origin"
# Expected: no output (evil.com is not in ALLOWED_ORIGINS)

curl -s -I -X OPTIONS https://your-domain.com/api/v1/health \
  -H "Origin: https://your-domain.com" \
  -H "Access-Control-Request-Method: POST" \
| grep -i "access-control-allow-origin"
# Expected: Access-Control-Allow-Origin: https://your-domain.com
```

---

## 13. Rate Limiting — Verify AI Endpoints

Rate limiting on AI endpoints requires an authenticated request. Confirm the `slowapi` middleware is active by checking the response headers on the chat endpoint:

```bash
curl -s -I -X POST https://your-domain.com/api/v1/consultations/MEMBER_ID/messages \
  -H "Authorization: Bearer VALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
| grep -i "x-ratelimit"
```

---

## 14. React Router — Nginx SPA Fallback

Verify deep links work (React Router v7 requires `try_files $uri $uri/ /index.html`):

```bash
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/reports
# Expected: 200 (Nginx serves index.html, React Router handles the route)
```

---

## 15. Smoke Test — End to End

```bash
# Health check
curl -s https://your-domain.com/api/v1/health

# Registration
curl -s -X POST https://your-domain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Test1234!","full_name":"Smoke Test"}'

# Login
TOKEN=$(curl -s -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Test1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Get profile
curl -s -H "Authorization: Bearer $TOKEN" https://your-domain.com/api/v1/auth/me
```

---

## 16. Post-Deployment Monitoring

### CloudWatch Log Groups to watch:
- Application errors: `/mediguide/backend/errors`
- API access: Nginx access log via CloudWatch Agent at `/var/log/nginx/access.log`

### Key metrics to verify after deployment:
- Uvicorn workers responding (2 workers on t3.micro)
- RDS connection pool not exhausted
- Bedrock API latency within SLA
- S3 presigned URL generation succeeding

### Application log check:
```bash
sudo journalctl -u mediguide-backend -n 100 --no-pager
```

---

## Migration Chain Reference

| Revision | Description | Applied By |
|---|---|---|
| `6f34ec737a6d` | Initial schema (all tables) | Task 0 / First deploy |
| `a1b2c3d4e5f6` | FK indexes (5 indexes) | Task 5 |
| `b2c3d4e5f6a7` | `document_s3_key` on `chat_messages` | Task 17 |

All three must be applied (`alembic upgrade head`) before starting the backend service.

---

## Rollback Procedure

If a critical issue is found after deployment:

```bash
# Stop traffic at the load balancer / DNS level first

# Revert database migration one step
cd /home/ubuntu/mediguide-x/backend
source venv/bin/activate
alembic downgrade -1

# Restore previous code
cd /home/ubuntu/mediguide-x
git checkout <previous-tag-or-commit>

# Reinstall dependencies
pip install -r requirements.txt
npm ci
VITE_API_BASE_URL=https://your-domain.com/api/v1 npm run build
sudo cp -r dist/* /var/www/mediguide/dist/

# Restart services
sudo systemctl restart mediguide-backend
sudo systemctl reload nginx
```
