# Lightsail backend deployment

The `CI` workflow deploys the backend to a self-hosted GitHub Actions runner installed on the Lightsail instance. The deploy job runs after the frontend and backend CI jobs pass on `main`. Pull requests run only on GitHub-hosted runners and never access the Lightsail instance. A manual workflow run on `main` also deploys the current commit.

The workflow builds the image with `backend/Dockerfile` and starts it with Docker Compose directly on Lightsail. The existing host-level Caddy systemd service terminates public HTTPS and forwards requests to `127.0.0.1:8080`; Docker publishes the backend on that loopback address only. Redis has no published host port and is isolated on an internal Docker network. PostgreSQL stays in Amazon RDS. Flyway applies checked-in database migrations when the backend starts. Do not add a second Caddy container because the host service already owns ports `80` and `443`.

## One-time Lightsail setup

1. In the GitHub repository, open **Settings → Actions → Runners → New self-hosted runner**, choose Linux x64, and follow the commands GitHub displays from a browser-based SSH session to the Lightsail instance. The registration token is short-lived, so use the current commands shown in GitHub.
2. Configure the runner as a service so it starts after a reboot. From the runner installation directory, use `sudo ./svc.sh install` and `sudo ./svc.sh start`, following [GitHub's runner service instructions](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application).
3. Install Docker Engine and Docker Compose plugin v2.33.1 or later. The minimum version is required for the backend's explicit outbound-network gateway priority. Add the runner's Linux user to the `docker` group, then restart the runner service so the permission takes effect.
4. Point the API hostname at the Lightsail static IP. The host Caddyfile must use that hostname and proxy to `127.0.0.1:8080`; keep the actual hostname out of tracked files. Confirm it resolves to this instance before deployment.
5. In the Lightsail firewall, allow TCP `80` and `443` for the existing Caddy service. Keep SSH (TCP `22`) restricted to trusted source IP addresses. Do not allow public inbound TCP `8080` or `6379`; GitHub does not SSH into the instance for deployment.
6. In the RDS security group, allow PostgreSQL TCP `5432` from the Lightsail instance's private IP (`/32`) or its associated security group, according to the VPC setup. Keep RDS public access disabled when private connectivity is available.
7. In GitHub repository **Settings → Secrets and variables → Actions**, add the repository secret `LIGHTSAIL_ENV_FILE` described below.

Before deployment, verify the host Caddy service is active and its Caddyfile is valid. The deploy workflow checks both before replacing the backend. After deployment, verify `https://<backend-domain>/api/v1/health`, the Vercel frontend, and the SePay IPN callback. Keep the existing SePay callback URL unchanged when retaining the current hostname. Only then remove any old public `8080` firewall rule. The existing Caddy service continues to manage HTTPS certificates and stores them on the host.

## `LIGHTSAIL_ENV_FILE` contents

Use one `KEY=value` entry per line without surrounding quotes. Do not include local `POSTGRES_*` settings. The workflow writes this secret to `~/edualto/.env` on each deployment with file permissions `600`. Compose passes values through as written, including `$` characters in passwords.

```dotenv
SPRING_DATASOURCE_URL=jdbc:postgresql://<RDS-endpoint>:5432/<database>?sslmode=require
SPRING_DATASOURCE_USERNAME=<database-user>
SPRING_DATASOURCE_PASSWORD=<database-password>
JWT_SECRET=<random-secret-at-least-32-bytes>
CORS_ALLOWED_ORIGINS=https://<frontend-domain>
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=None
```

Add production values for any enabled integrations, such as Cloudflare R2, SMTP, or payment providers. The RDS endpoint must be reachable from the Lightsail instance through the configured VPC peering and RDS security group rules.

For Gemini import/chatbot, add repository secret `GEMINI_API_KEY`. The workflow inserts the backend AI settings into the production env file automatically. An optional repository variable `GEMINI_MODEL` selects another available stable model. See [Gemini AI setup](gemini-ai.md) for local env entries and Free Tier limits.

## Deploy behavior

- Push to `main`: run CI, then deploy only if both CI jobs succeed.
- Push to another branch or open a pull request: CI only; the Lightsail runner does not run pull request code.
- Deploys are serialized so a new push will not interrupt a deployment already running.
- The API listens on port `8080` inside Docker and is published only at host loopback `127.0.0.1:8080` for the existing Caddy service.
- Set the Vercel environment variable `NEXT_PUBLIC_API_BASE_URL` to `https://<backend-domain>/api/v1` and set `CORS_ALLOWED_ORIGINS` to the exact production frontend origin.
- Keep the payment provider callback URL at `https://<backend-domain>/api/v1/payments/sepay/ipn` when retaining the current hostname.
