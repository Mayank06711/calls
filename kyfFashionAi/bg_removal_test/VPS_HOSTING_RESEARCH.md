# VPS / Cloud Hosting Research for KYF Fashion AI
**Date**: February 2026
**Requirement**: 2 vCPU, 2-4 GB RAM, 20GB+ SSD, Linux (Ubuntu)
**Use case**: Python AI service (silueta + u2netp bg removal, ~200-300MB RAM)

---

## FREE TIER OPTIONS (Best to Worst)

### 1. Oracle Cloud — BEST FREE TIER (Always Free, Never Expires)
- **Specs**: 4 ARM Ampere cores + 24 GB RAM (splittable into up to 4 VMs)
- **Storage**: 200 GB block + 20 GB object storage
- **Bandwidth**: 10 TB/month
- **India DC**: YES — Mumbai
- **Expires**: NEVER
- **Catches**: ARM architecture (need ARM-compatible onnxruntime), hard to provision (capacity issues)
- **Link**: https://www.oracle.com/cloud/free/

### 2. Google Cloud — $300 Free Credit (90 days)
- **Always-free VM**: 1 e2-micro (2 shared vCPU, 1 GB RAM) — too small
- **Trial credit**: $300 for 90 days — can run a proper instance for 2-3 months
- **India DC**: Mumbai available (with paid)
- **Link**: https://cloud.google.com/free

### 3. AWS Free Tier — 12 Months
- **Specs**: t2.micro/t3.micro — 1 vCPU, 1 GB RAM (too small)
- **Storage**: 30 GB EBS
- **India DC**: YES — Mumbai (ap-south-1)
- **Expires**: 12 months
- **Link**: https://aws.amazon.com/free/

### 4. Azure Free Tier — 12 Months
- **Specs**: B1s — 1 vCPU, 1 GB RAM (too small)
- **Trial credit**: $200 for 30 days
- **Expires**: 12 months
- **Link**: https://azure.microsoft.com/en-us/pricing/free-services

### 5. Vultr Free Tier — Always Free (Limited)
- **Specs**: 1 vCPU, 512 MB RAM, 10 GB SSD (too small)
- **Catches**: Limited availability, randomized acceptance
- **Link**: https://www.vultr.com/free-tier-program/

### 6. Render — Free with Sleep
- **Catches**: Service sleeps after 15 min of no traffic, ~1 min cold start
- **Link**: https://render.com/pricing

### 7. Fly.io — Trial Only
- **Specs**: 2 VM hours or 7 days, whichever comes first
- **Link**: https://fly.io/pricing

### 8. Railway — $5 One-Time Credit
- **Specs**: $5 credit expires in 30 days, then $1/mo free
- **Link**: https://railway.com/pricing

---

## CHEAPEST PAID VPS (Sorted by Price)

| # | Provider | Specs | Price/mo | India DC? | Link |
|---|----------|-------|----------|-----------|------|
| 1 | **RackNerd** | 2 vCPU, 2GB, 30GB SSD | **$1.47** ($17.66/yr) | No (US) | https://www.racknerd.com/ |
| 2 | **Time4VPS** | 2GB, 20GB SSD | **$1.29** | No (Lithuania) | https://www.time4vps.com/ |
| 3 | **DartNode** | 2 vCPU, 2GB, 40GB NVMe | **$2.00** | No (US) | https://dartnode.com/vps |
| 4 | **Netcup** | 2GB, 20GB SSD | **$1.61** | No (Germany) | https://www.netcup.com/en/server/vps |
| 5 | **Hetzner CX22** | 2 vCPU, 4GB, 40GB SSD, 20TB BW | **$4.10** (EUR 3.79) | Singapore | https://www.hetzner.com/cloud/ |
| 6 | **Contabo VPS 1** | 4 vCPU, 8GB, 100GB NVMe, unlimited BW | **$4.95** | Singapore | https://contabo.com/en/vps-server/ |
| 7 | **OVHcloud** | Entry VPS | **$4.20** | Singapore | https://us.ovhcloud.com/vps/ |
| 8 | **Hostinger** | 1 vCPU, 4GB, 50GB NVMe | **$4.99** (24-mo term) | No | https://www.hostinger.com/vps-hosting |
| 9 | **BuyVM** | 0.5 core, 2GB, 40GB SSD | **$7.00** | No (US) | https://buyvm.net/ |
| 10 | **IONOS VPS** | 2 vCPU, 4GB, 160GB, unlimited BW | **$6-9** | No (US, EU) | https://www.ionos.com/servers/vps |
| 11 | **DigitalOcean** | 1 vCPU, 2GB, 50GB SSD | **$12** | **Bangalore** | https://www.digitalocean.com/pricing/droplets |
| 12 | **Vultr** | 1 vCPU, 2GB, 50GB SSD | **$12** | **Mumbai, Delhi, Bangalore** | https://www.vultr.com/pricing/ |
| 13 | **Linode/Akamai** | 1 vCPU, 2GB, 50GB SSD | **$12** | **Mumbai** | https://www.linode.com/pricing/ |

### Deal Tracker for RackNerd promos:
https://racknerdtracker.com/

---

## INDIAN PROVIDERS

| # | Provider | Price (INR/mo) | Price (USD/mo) | Link |
|---|----------|----------------|----------------|------|
| 1 | **YouStable** | Rs 349/mo (2-yr term) | ~$4.10 | https://www.youstable.com/ |
| 2 | **Hostinger India** | Rs 399/mo | ~$4.70 | https://www.hostinger.in/vps-hosting |
| 3 | **HostingRaja** | Rs 499/mo | ~$5.90 | https://www.hostingraja.in/ |
| 4 | **MilesWeb** | Rs 1,299/mo | ~$15.30 | https://www.milesweb.in/hosting/vps-hosting/ |
| 5 | **BigRock** | Rs 1,749/mo | ~$20.60 | https://www.bigrock.in/vps-hosting |

---

## PRICE COMPARISON TOOLS

- **GetDeploying** (compare all VPS prices): https://getdeploying.com/reference/compute-prices
- **HostAdvice** (reviews + comparisons): https://hostadvice.com/vps/cheap-vps/

---

## RECOMMENDATIONS

### Best Free: Oracle Cloud (Mumbai) — Rs 0/month
4 ARM cores + 24GB RAM, Mumbai DC, always free. Try this first.

### Best Budget: Contabo — Rs 415/month ($4.95)
4 vCPU + 8GB RAM + 100GB NVMe. Singapore DC (~50ms to India). Massive overkill for the price.

### Best Reliability: Hetzner CX22 — Rs 345/month ($4.10)
2 vCPU + 4GB RAM. Singapore DC. Great reputation. WARNING: Price increase April 2026.

### Best with India DC: Vultr/DigitalOcean — Rs 1000/month ($12)
Only if you absolutely need a datacenter in India for lowest latency.

---

## WARNINGS

1. **Hetzner price hike**: 30-37% increase coming April 1, 2026. Lock in current pricing before then.
2. **RackNerd**: Best prices are from promotional events (Black Friday, New Year). Check the tracker.
3. **Contabo**: May oversell — CPU-heavy AI workloads could see throttling under peak load.
4. **Oracle free tier**: Provisioning ARM instances is notoriously difficult. Use retry scripts.
5. **Indian budget providers**: Verify exact specs at 2vCPU/2GB tier — base prices may be for smaller plans.
