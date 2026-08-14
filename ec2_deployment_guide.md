# Mediguide X - EC2 Production Deployment Guide

This guide walks you through the exact steps to deploy the Mediguide X application to your AWS EC2 instance (`t3.micro` in `us-west-2`) and secure it with your new domain name.

## Step 1: Point Your Domain to EC2
Before touching the server, configure your domain's DNS:
1. Log into your domain registrar (GoDaddy, Namecheap, Route53, etc.).
2. Go to DNS Management.
3. Add an **A Record**:
   - **Host/Name:** `@` (or leave blank for the root domain)
   - **Value/Target:** `<Your EC2 Elastic IP>`
   - **TTL:** Lowest possible or default.

*(Note: DNS changes can take 5-15 minutes to propagate).*

---

## Step 2: SSH into Your EC2 Instance
Open your terminal (or Command Prompt/PowerShell) and connect to your EC2 instance using your `.pem` key:

```bash
ssh -i path/to/your-key.pem ubuntu@<Your_EC2_Elastic_IP>
```

---

## Step 3: Install System Dependencies
Once logged in, run these commands to install Node.js, Python, Nginx, and Certbot:

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Python, Nginx, and SSL tools
sudo apt install python3-pip python3-venv nginx certbot python3-certbot-nginx -y

# Install Node.js (Version 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## Step 4: Transfer the Project Files
You need to get your project code onto the server. You can either use `git clone` if your code is on GitHub, or use `scp` from your local machine.

**Option A (Using Git):**
```bash
git clone <your-github-repo-url> /home/ubuntu/mediguide-x
```

**Option B (Secure Copy from your Windows local machine):**
Open a *new* terminal window on your local PC and run:
```powershell
scp -i path/to/your-key.pem -r F:\AI_Chat ubuntu@<Your_EC2_Elastic_IP>:/home/ubuntu/mediguide-x
```

---

## Step 5: Build the React Frontend
Prepare the production build of the frontend and move it to the web server directory.

```bash
# 1. Navigate to the project root
cd /home/ubuntu/mediguide-x

# 2. Install Node dependencies
npm install

# 3. Build the frontend
npm run build

# 4. Create the web directory and copy the build files
sudo mkdir -p /var/www/mediguide/dist
sudo cp -r dist/* /var/www/mediguide/dist/

# 5. Set correct permissions
sudo chown -R www-data:www-data /var/www/mediguide/dist
```

---

## Step 6: Setup the FastAPI Backend
Create a virtual environment and install Python dependencies.

```bash
# 1. Navigate to the backend directory
cd /home/ubuntu/mediguide-x/backend

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create your production .env file
nano .env
```
*(In the `nano` editor, paste your database connection string, AWS keys, etc. Press `Ctrl+O`, `Enter` to save, and `Ctrl+X` to exit).*

---

## Step 7: Apply the Configuration Files
I have prepared the Systemd and Nginx files for you in the `deploy` folder. You just need to edit the domain name and copy them.

**1. Update the Nginx config with your domain name:**
```bash
nano /home/ubuntu/mediguide-x/deploy/mediguide.nginx
```
Find the line `server_name your-domain.com;` and replace `your-domain.com` with the domain name you just bought. Save and exit.

**2. Copy the Nginx configuration:**
```bash
sudo cp /home/ubuntu/mediguide-x/deploy/mediguide.nginx /etc/nginx/sites-available/mediguide
sudo ln -s /etc/nginx/sites-available/mediguide /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

**3. Copy the Systemd service (keeps the backend running):**
```bash
sudo cp /home/ubuntu/mediguide-x/deploy/mediguide-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
```

---

## Step 8: Start the Services & Secure with SSL
Now, let's start the backend, restart Nginx, and generate your free SSL certificate.

```bash
# 1. Start the FastAPI backend
sudo systemctl enable --now mediguide-backend

# 2. Check if it's running successfully
sudo systemctl status mediguide-backend

# 3. Test Nginx syntax and restart it
sudo nginx -t
sudo systemctl restart nginx

# 4. Generate SSL Certificate via Certbot (Answer the prompts on screen)
# Make sure to replace your-domain.com with your actual domain!
sudo certbot --nginx -d your-domain.com
```

---

## Step 9: CloudWatch Monitoring (Final Step)
To ensure we get alerts if the system crashes:

```bash
# 1. Install CloudWatch Agent
wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# 2. Start the Agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c default
```
After this, you can visit the **CloudWatch Dashboard** in your AWS Console to set up your graphs and the `MediguideX-HighErrorRateAlarm` as per the Sprint 5 plan!

---
**🎉 You are done! Visit `https://your-domain.com` in your browser to verify the production deployment.**
