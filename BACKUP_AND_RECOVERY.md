# Backup and Disaster Recovery Plan

**Document Version:** 1.1
**Last Reviewed:** September 2026
**Status:** RUNBOOK ONLY — DEPLOYED BACKUPS AND RESTORES UNVERIFIED

> Evidence warning: the schedules, retention periods, integrity checks, and restore timings below are recovery targets and operator procedures. They are not evidence that production backups are enabled or healthy. No production cloud configuration, backup artifact, last-success timestamp, or completed restore was available in the repository review. Do not report this runbook as an active backup system.

## Evidence status

| Stateful system | Repository evidence | Deployed backup evidence | Restore evidence |
| --- | --- | --- | --- |
| Firestore | Rules, indexes, and proposed backup procedure | Not verified | Not verified |
| Firebase Realtime Database (chat/presence) | Rules and emulator configuration; procedure still required | Not verified | Not verified |
| Firebase Storage | Rules and proposed bucket-copy procedure | Not verified | Not verified |
| PostgreSQL audit/transaction data | Schema/client code and proposed Cloud SQL procedure | Not verified | Not verified |
| Firebase Authentication | Application integration only; export/restore procedure still required | Not verified | Not verified |
| Secrets/runtime configuration | Required variable names and proposed Secret Manager procedure | Not verified | Not verified |
| Source/configuration | Current Git checkout contains application source, rules, indexes, and emulator configuration | Git history/remote availability not independently audited | A clean checkout is possible; deployment rollback was not exercised |

Before changing this status, attach non-secret evidence for every applicable system: schedule/policy identifiers, latest successful run timestamps, retention settings, alert ownership, and a dated restore drill result in an isolated project. Never attach credentials, tokens, database contents, or user data.

## Executive Summary

This document outlines SkillSwap's backup and disaster recovery strategy to ensure business continuity and data protection in the event of infrastructure failures, regional instability, or data loss scenarios.

Due to regional instability and geopolitical concerns, robust backup and recovery procedures are critical for SkillSwap's resilience.

---

## 1. Database Backup Strategy

### 1.1 Firestore Backup (Primary Database)

**Frequency:** Daily automated backups
**Retention:** 30 days rolling backup retention
**Location:** Geographic redundancy (multiple regions)
**Implementation:**

- **Google Cloud Console:**
  1. Navigate to Firestore → Manage → Backups
  2. Create a scheduled backup policy:
     - Time: 02:00 UTC (daily)
     - Retention: 30 days
     - Destination: `gs://skillswap-backups/firestore/daily/`

- **Terraform/IaC (Recommended for production):**
  ```hcl
  resource "google_firestore_backup_schedule" "daily" {
    parent       = "projects/${data.google_client_config.current.project}"
    retention    = "2592000s" # 30 days
    display_name = "Daily Firestore Backup"
    
    daily_recurrence {
      time = "02:00:00Z"
    }
  }
  ```

**Retention Policy:**
- Daily backups retained for 30 days
- Weekly backups retained for 90 days (manual export)
- Monthly backups retained for 1 year (manual export)

**Backup Verification:**
- Automated integrity checks run weekly
- Test restore from backups monthly to a staging environment
- Document any inconsistencies or corruption immediately

### 1.2 PostgreSQL Backup (Audit & Transaction Log)

**Frequency:** Hourly automated backups
**Retention:** 7 days automated, 30 days manual
**Location:** Cloud SQL automated backups + GCS storage

**Implementation:**

- **Google Cloud SQL Setup:**
  1. In Cloud SQL instance settings:
     - Automated backups: Every 6 hours
     - Backup window: 02:00-06:00 UTC
     - Binary log: Enabled for point-in-time recovery
     - Retention: 7 days

- **Backup Export to GCS:**
  ```bash
  # Scheduled Cloud Function (runs daily at 03:00 UTC)
  gcloud sql export sql skillswap-postgres \
    gs://skillswap-backups/postgres/$(date +%Y-%m-%d).sql \
    --database=skillswap_db
  ```

**Backup Encryption:**
- All backups encrypted at rest (GCS default)
- Customer-managed encryption keys (CMEK) recommended for production
- Set `CMEK_KEY_RING` environment variable if using CMEK

---

## 2. Storage Backup (Firebase Storage)

### 2.1 User-Uploaded Files (Images, Documents)

**Frequency:** Daily incremental backups
**Retention:** 30 days

**Implementation:**

- **GCS Backup Bucket Setup:**
  ```bash
  gsutil mb -l REGION gs://skillswap-storage-backups/
  gsutil versioning set on gs://skillswap-storage-backups/
  ```

- **Sync Script (Cloud Scheduler + Cloud Function):**
  ```bash
  #!/bin/bash
  # Run daily at 03:30 UTC
  gsutil -m rsync -r -d gs://skillswap-storage gs://skillswap-storage-backups/
  ```

- **Retention Policy:**
  ```bash
  gsutil lifecycle set lifecycle.json gs://skillswap-storage-backups/
  ```
  
  Where `lifecycle.json`:
  ```json
  {
    "lifecycle": {
      "rule": [
        {
          "action": {"type": "Delete"},
          "condition": {"age": 30}
        }
      ]
    }
  }
  ```

### 2.2 Configuration Files Backup

**Include:**
- Firebase configuration (`firebase.json`)
- Firestore security rules (`firestore.rules`)
- Storage CORS rules (`storage.cors.json`)
- Database indexes (`firestore.indexes.json`)

**Storage:** Git repository (version controlled) + GCS
**Frequency:** After any production config change (immediate)
**Retention:** Indefinite (Git history)

---

## 3. Environment Variables & Secrets Backup

### 3.1 Secret Management

**DO NOT** store secrets in code or configuration files.

**Use Google Secret Manager:**

```bash
# Store secrets
gcloud secrets create geidea-merchant-id \
  --replication-policy="automatic"
gcloud secrets versions add geidea-merchant-id \
  --data-file=- <<< "$GEIDEA_MERCHANT_ID"

# Retrieve in Cloud Functions
MERCHANT_ID=$(gcloud secrets versions access latest --secret="geidea-merchant-id")
```

**Backup Strategy for Secrets:**
1. Use Secret Manager's built-in redundancy (automatic across regions)
2. Document secret names and rotation schedule in this file
3. Audit access logs: `gcloud logging read "resource.type=secretmanager.googleapis.com"`
4. Rotate secrets quarterly or after personnel changes

**Secrets to Manage:**
- `GEIDEA_MERCHANT_ID`
- `GEIDEA_API_PASSWORD`
- `GEIDEA_WEBHOOK_SECRET`
- `POSTGRES_CONNECTION_STRING`
- `FIREBASE_ADMIN_KEY` (service account JSON)
- `JWT_SECRET` (if applicable)

### 3.2 Environment Variables Backup

**Backup Location:** Encrypted Google Cloud Storage or Secret Manager

**List of Critical Env Vars:**
```
NODE_ENV=production
FUNCTIONS_EMULATOR=false
GEIDEA_BASE_URL=https://api.geidea.net
GEIDEA_CALLBACK_URL=https://skillswap.app/api/payments/callback
GOOGLE_MAPS_API_KEY=***
POSTGRES_CONNECTION_STRING=***
USE_MOCK_PAYMENTS=0 (production: 0, staging: can be 1)
ENFORCE_APP_CHECK=true
ALLOWED_ORIGINS=https://skillswap.app,https://www.skillswap.app
```

**Backup Procedure:**
1. Export environment from production deployment:
   ```bash
   firebase functions:config:get > firebase-config-backup-$(date +%Y-%m-%d).json
   ```
2. Store in encrypted GCS bucket with restricted access
3. **CRITICAL:** Remove all secrets before committing to version control

---

## 4. Deployment & Rollback Plan

### 4.1 Version Control & Deployment History

**Repository:** GitHub (skillswap/webapp)
**Branches:** `main` (production), `staging`, `develop`
**CI/CD:** GitHub Actions or Firebase Hosting automatic deployment

**Deployment Process:**
1. All changes merged to `main` trigger automated deployment
2. Tag releases: `v1.0.0`, `v1.0.1`, etc.
3. Deployment logs stored in Google Cloud Logging
4. Each deployment creates a Firebase Hosting snapshot

### 4.2 Rollback Procedures

#### Frontend (Next.js on Firebase Hosting)

**Automatic Rollback (Last 25 deployments retained):**
```bash
# List recent deployments
firebase hosting:channel:list

# Rollback to previous version
firebase deploy --only hosting

# Or use Firebase Console → Hosting → Versions → Select and restore
```

**Manual Rollback Steps:**
1. Identify the problematic deployment in Firebase Console
2. Click "Restore" on a known-good previous version
3. Deployment takes 1-2 minutes
4. Verify in staging environment first if possible

#### Backend (Cloud Functions)

**Automatic Rollback:**
```bash
# Cloud Functions maintains previous versions
gcloud functions describe skillswap-api --gen2

# Rollback to previous version
gcloud functions deploy skillswap-api \
  --runtime=nodejs20 \
  --gen2 \
  --source=gs://function-source-bucket/previous-version.tar.gz
```

**Manual Rollback:**
1. Tag the stable commit in Git
2. Re-deploy from that tag:
   ```bash
   git checkout v1.0.0
   firebase deploy --only functions
   ```

#### Database Rollback

**Firestore:**
```bash
# Restore from backup
gcloud firestore databases restore BACKUP_ID \
  --async \
  --database=skillswap-db

# Verify restore completed
gcloud firestore operations describe OPERATION_ID
```

**PostgreSQL:**
```bash
# Point-in-time recovery
gcloud sql backups restore BACKUP_ID \
  --backup-instance=skillswap-postgres \
  --backup-configuration=default
```

### 4.3 Deployment Checklist

Before any production deployment:
- [ ] All tests pass (unit, integration, E2E)
- [ ] Database migrations tested on staging
- [ ] Security audit completed
- [ ] Secrets not exposed in code
- [ ] Performance benchmarks meet standards
- [ ] Backup before deployment initiated
- [ ] Rollback plan reviewed and tested
- [ ] Team notified of deployment window
- [ ] Monitoring alerts configured

---

## 5. Disaster Recovery Procedures

### 5.1 Regional Failure (e.g., Middle East regional outage)

**Scenario:** Firebase region becomes unavailable

**Response Time Target:** 15 minutes to alternative region

**Steps:**
1. **Detect:** Monitoring alerts trigger automatically
2. **Assess:** Verify region status via Google Cloud Status Dashboard
3. **Failover:**
   - Switch DNS to alternative region (if configured)
   - Or restore from backup in alternate geography
4. **Communicate:** Notify users of service restoration

**Prevention:**
- Configure multi-region Firebase deployment (Firestore)
- Use global load balancing for API
- Set up Cross-Region Replication for PostgreSQL

### 5.2 Data Corruption or Accidental Deletion

**Scenario:** Database corrupted or critical data deleted

**Response:**
1. **Stop:** Pause writes to affected database
2. **Restore:** Use latest backup to restore data
3. **Validate:** Verify data integrity before resuming
4. **Audit:** Identify cause and implement safeguards

**Timeline:**
- Detection: Minutes (automated alerts)
- Backup retrieval: 5-10 minutes
- Data restore: 15-60 minutes (depends on size)
- Validation: 10-30 minutes
- Resume operations: ~60-90 minutes total

### 5.3 Security Incident (Data Breach, Unauthorized Access)

**Scenario:** Unauthorized access to user data

**Immediate Actions:**
1. Revoke compromised credentials
2. Rotate secrets (see Section 3.2)
3. Enable emergency logging
4. Notify affected users if PII exposed
5. Backup current state (forensic evidence)

**Long-term:**
- Audit logs: Review all access in Google Cloud Logging
- Update security rules: Tighten Firestore & Storage permissions
- Force password resets if needed
- Implement additional MFA requirements

### 5.4 Full Infrastructure Failure

**Scenario:** Complete service outage

**Recovery Approach:**
1. **Restore Firebase Project:**
   ```bash
   gcloud firebase projects restore PROJECT_ID \
     --from-backup=BACKUP_ID
   ```
2. **Restore Cloud Functions:** Re-deploy from source
3. **Restore Databases:** Restore Firestore and PostgreSQL from backups
4. **Verify:** Run health checks and smoke tests
5. **Restore Storage:** Restore user files from GCS backups

**Estimated Recovery Time:** 2-4 hours

---

## 6. Testing & Validation

### 6.1 Backup Restoration Tests

**Schedule:** Monthly (first Monday of each month)

**Procedure:**
1. Create staging environment replica
2. Restore from backup to staging
3. Run smoke tests (can users sign in? Can they create listings?)
4. Verify data integrity (record counts, checksums)
5. Document results in incident tracker

**Example Test Script:**
```bash
#!/bin/bash
# Restore and validate backups

echo "Testing Firestore backup restore..."
gcloud firestore databases restore LATEST_BACKUP \
  --database=staging-db \
  --async

echo "Testing PostgreSQL backup restore..."
gcloud sql backups restore LATEST_BACKUP \
  --backup-instance=skillswap-postgres-staging

echo "Running smoke tests..."
curl -f https://staging-skillswap.app/health
curl -f https://staging-skillswap.app/api/health

echo "Backup restoration test complete."
```

### 6.2 Failover Simulation

**Schedule:** Quarterly

**Procedure:**
1. Announce scheduled maintenance window
2. Manually trigger failover to backup region/instance
3. Measure failover time and impact
4. Verify all features work in failover state
5. Failback to primary region
6. Document lessons learned

---

## 7. Monitoring & Alerting

### 7.1 Backup Status Monitoring

**Metrics to Track:**
- Last successful backup timestamp
- Backup size (detect anomalous growth)
- Restore time estimates
- Backup failure count

**Alerts (Critical):**
```bash
# Alert if no backup for 24 hours
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Firestore Backup Failed" \
  --condition-threshold-value=0 \
  --condition-threshold-duration=86400s
```

### 7.2 Health Checks

**Daily health checks:**
- Firestore read/write latency
- PostgreSQL connection pool status
- Storage access times
- Function execution times

**Weekly:**
- Database replication lag (if applicable)
- Backup completion status
- Secret rotation schedule compliance

---

## 8. Documentation & Runbooks

### 8.1 Key Contacts

**On-Call Engineer:** [Phone/Slack/Email]  
**Database Administrator:** [Name]  
**Security Officer:** [Name]

### 8.2 Related Documentation

- [Production Deployment Guide](DEPLOYMENT.md)
- [Incident Response Runbook](INCIDENT_RESPONSE.md)
- [Security Audit Report](PRODUCTION_CHECKLIST.md)

### 8.3 Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-29 | Initial Backup Plan v1.0 | Regional stability concerns |

---

## 9. Compliance & Legal

**Data Retention:**
- User data: Retained per user account status (deleted on account deletion)
- Backups: 30 days automated (longer for manual exports per compliance)
- Audit logs: 90 days minimum (GCP default)
- Payment records: 7 years (PCI DSS requirement)

**GDPR Compliance:**
- Right to be forgotten: Delete from primary + all backups within 30 days
- Data portability: Automated export on user request

---

## 10. Emergency Contacts & Escalation

**Tier 1 - Initial Alert:** On-call engineer  
**Tier 2 - Major Incident:** Engineering lead + Database admin  
**Tier 3 - Critical Outage:** CTO + Incident commander  
**External Escalation:** Google Cloud Support (Business plan)

---

**Document Owner:** DevOps / Infrastructure Team  
**Last Review:** April 2026  
**Next Review:** July 2026

---
