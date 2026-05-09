# Maintenance and Disaster Recovery Plan
## SIA102x E-Commerce System

**Version:** 1.0  
**Last Updated:** May 4, 2026  
**Document Owner:** Operations Team

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [RTO & RPO Objectives](#rto--rpo-objectives)
4. [Backup & Recovery Procedures](#backup--recovery-procedures)
5. [Regular Maintenance Tasks](#regular-maintenance-tasks)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Disaster Scenarios & Response](#disaster-scenarios--response)
8. [Incident Response Procedures](#incident-response-procedures)
9. [Documentation & Runbooks](#documentation--runbooks)
10. [Testing & Validation](#testing--validation)

---

## Executive Summary

This document outlines comprehensive maintenance, backup, and disaster recovery procedures for the SIA102x e-commerce system. The plan ensures business continuity, minimizes data loss, and provides rapid recovery capabilities in case of system failures or disasters.

### Key Metrics
- **Recovery Time Objective (RTO):** 4 hours
- **Recovery Point Objective (RPO):** 1 hour
- **Backup Frequency:** Every 6 hours (daily full backup + hourly incremental)
- **Backup Retention:** 30 days

---

## System Overview

### System Components
- **Frontend:** React.js application (Vite bundled)
- **Backend:** C# ASP.NET Core REST API
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth with JWT tokens
- **File Storage:** Cloud storage for product images
- **Monitoring:** Application Performance Monitoring (APM)

### Critical Business Functions
1. Order Management
2. Inventory Tracking
3. Product Catalog
4. Customer Data
5. Financial Transactions
6. Employee Management

---

## RTO & RPO Objectives

### Recovery Time Objective (RTO)

| Component | RTO | Justification |
|-----------|-----|---------------|
| Frontend Application | 1 hour | Can use backup/rollback |
| Backend API | 2 hours | Database recovery needed |
| Database | 3 hours | Full restoration with verification |
| Email Notifications | 2 hours | Non-critical, queued operations |
| Reports/Analytics | 4 hours | Can be regenerated |

### Recovery Point Objective (RPO)

| Component | RPO | Strategy |
|-----------|-----|----------|
| Database | 1 hour | Hourly incremental backups |
| Application Code | 30 minutes | Version control, automated deployment |
| Configuration | 30 minutes | Infrastructure as Code |
| Customer Data | 1 hour | Transactional logs |

---

## Backup & Recovery Procedures

### Backup Strategy

```
Daily Backup Schedule:
├─ 00:00 - Full Database Backup
├─ 06:00 - Full Database Backup
├─ 12:00 - Full Database Backup
├─ 18:00 - Full Database Backup
└─ Every hour - Incremental/Transaction Log Backup (hourly)

Storage:
├─ On-site/Primary: Hot storage (24-hour access)
├─ Cloud Archive: Warm storage (30-day retention)
└─ Offsite/Cold: Archive storage (yearly retention)
```

### Database Backup Procedures

#### Step 1: Automated Backup (Recommended)

**Using Supabase Built-in Backup:**
```bash
# Enable automated backups in Supabase dashboard
# Settings > Backups > Enable Automatic Backups

# Schedule: Daily at 2:00 AM UTC
# Retention: 30 days
# Frequency: Daily full + hourly incremental
```

#### Step 2: Manual Full Backup

```bash
# Using pg_dump
pg_dump -h <supabase-host> \
  -U postgres \
  -d postgres \
  --format=custom \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Using Supabase CLI
supabase db pull --db-url "<connection-string>" > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Step 3: Verify Backup Integrity

```bash
# List backup files
ls -lh backup_*.dump

# Verify backup size (should match approximate DB size)
# Check file is readable
file backup_*.dump

# Test restore in isolated environment
pg_restore -d test_db -v backup_*.dump
```

#### Step 4: Backup Storage

**Primary Storage (Hot):**
- Location: Same cloud provider
- Retention: 7 days
- Access: Immediate
- Cost: Higher

**Archive Storage (Cold):**
- Location: Geographically distant
- Retention: 30 days
- Access: 1-2 hours
- Cost: Lower

### Database Recovery Procedures

#### Scenario 1: Point-in-Time Recovery (PITR)

```bash
# If database is accessible but corrupted

# Step 1: Create new database
CREATE DATABASE restored_db;

# Step 2: Restore from backup
pg_restore -d restored_db -v backup_2026_05_04.dump

# Step 3: Verify data
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;

# Step 4: Test application connections
# Run integration tests

# Step 5: Switch to restored database (during maintenance window)
# Update connection strings
# Verify all features work
```

#### Scenario 2: Complete Database Loss

```bash
# Step 1: Alert stakeholders
# Step 2: Provision new database instance
# Step 3: Restore from latest backup
psql -h <new-host> -U postgres < backup_latest.sql

# Step 4: Restore incremental/transaction logs
psql -h <new-host> -U postgres < incremental_backup.sql

# Step 5: Update all application connection strings
# Step 6: Restart all services
# Step 7: Run health checks
curl https://<api-url>/health
```

#### Scenario 3: Data Corruption

```bash
-- Identify corrupted data
SELECT * FROM products WHERE id = <corrupted_id>;

-- Restore specific table from backup
DROP TABLE products;
CREATE TABLE products AS SELECT * FROM backup_products;

-- Verify integrity
SELECT COUNT(*) FROM products;
```

### Application Code Backup

#### Frontend Backup

```bash
# Automatic: Git repository (primary backup)
# Manual backup of build artifacts
zip -r frontend_backup_$(date +%Y%m%d).zip dist/

# Store backup
cp frontend_backup_*.zip /backup/archive/
```

#### Backend Backup

```bash
# Automatic: Git repository (primary backup)
# Manual backup of publish directory
Compress-Archive -Path src/backend/publish -DestinationPath backend_backup_$(date +%Y%m%d).zip

# Store backup
cp backend_backup_*.zip /backup/archive/
```

---

## Regular Maintenance Tasks

### Daily Tasks (Automated)

| Task | Schedule | Owner | Verify |
|------|----------|-------|--------|
| Database Backup | 12:00 AM, 6:00 AM, 12:00 PM, 6:00 PM | Automated | Check backup file size > 0 |
| Log Rotation | 1:00 AM | Automated | No logs > 1GB |
| Cache Cleanup | 3:00 AM | Automated | Cache size < threshold |
| Health Checks | Every 5 minutes | Automated | All green |

### Weekly Tasks

#### Monday: Database Optimization
```bash
# Vacuum and analyze tables
VACUUM ANALYZE;

# Check index usage
SELECT * FROM pg_stat_user_indexes 
WHERE idx_scan = 0;

# Reindex if needed
REINDEX INDEX index_name;
```

#### Wednesday: Log Review
```bash
# Review application logs
tail -n 1000 /var/log/api/application.log | grep ERROR

# Review database logs
SELECT * FROM pg_log WHERE log_time > now() - interval '7 days' AND level = 'ERROR';

# Generate report
```

#### Friday: Backup Verification
```bash
# Test restore of latest backup
# Verify all files restore correctly
# Check data integrity
# Confirm backup size is reasonable
```

### Monthly Tasks

#### 1st of Month: Full System Audit
```bash
# Database health check
SELECT * FROM pg_stat_database;

# Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Connection review
SELECT * FROM pg_stat_activity;

# Security review
SELECT * FROM information_schema.table_privileges WHERE grantee NOT IN ('postgres', 'public');
```

#### 15th of Month: Disaster Recovery Drill
```bash
# Test complete recovery scenario
# Measure actual RTO
# Document any gaps
# Update procedures if needed
```

### Quarterly Tasks

#### Security Audit
- [ ] Verify all backups are encrypted
- [ ] Check access logs for unauthorized access
- [ ] Verify firewall rules are correct
- [ ] Review user permissions
- [ ] Verify SSL/TLS certificates

#### Capacity Planning
- [ ] Analyze disk usage trends
- [ ] Predict storage needs for next quarter
- [ ] Review database growth rate
- [ ] Assess performance metrics

### Annual Tasks

#### Compliance Audit
- [ ] GDPR compliance review
- [ ] Data retention policy enforcement
- [ ] Audit trail verification
- [ ] Encryption key rotation
- [ ] Backup retention verification

---

## Monitoring & Alerting

### Key Metrics to Monitor

#### Database Performance
```
- Query execution time
- Lock wait times
- Connection count
- Cache hit ratio
- Disk I/O operations
- Table bloat percentage
```

#### Application Performance
```
- API response time (p50, p95, p99)
- Error rate (errors per minute)
- Request throughput
- CPU usage
- Memory usage
- Disk usage
```

#### Business Metrics
```
- Active users
- Failed transactions
- Order completion rate
- Payment success rate
- Customer signup rate
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Usage | > 70% | > 90% | Scale up resources |
| Memory Usage | > 75% | > 95% | Restart application |
| Disk Usage | > 80% | > 95% | Clean logs/cache |
| Error Rate | > 1% | > 5% | Page on-call engineer |
| API Latency | > 1s | > 5s | Investigate performance |
| DB Connections | > 80% pool | > 95% pool | Restart app/DB |
| Backup Failure | - | Any failure | Investigate & retry |

### Monitoring Setup

#### Application Monitoring (APM)
```bash
# Install monitoring agent
# Configure to track:
# - Request latency
# - Error rates
# - Resource usage
# - Business transactions

# Dashboard setup
# - Overview dashboard
# - Performance dashboard
# - Error dashboard
# - Business metrics dashboard
```

#### Database Monitoring
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second

-- Enable slow query log
ALTER SYSTEM SET log_slow_queries = on;
ALTER SYSTEM SET slow_query_log_threshold = 2000; -- 2 seconds

SELECT pg_reload_conf();
```

#### Infrastructure Monitoring
```bash
# CPU, Memory, Disk monitoring
# Network monitoring
# Service availability monitoring
# Log aggregation
```

---

## Disaster Scenarios & Response

### Scenario 1: Database Server Crash

**Severity:** CRITICAL  
**RTO:** 3 hours  
**RPO:** 1 hour (possible data loss: up to 1 hour)

**Detection:**
```bash
# Alert triggers:
# - Database unreachable (connection timeout)
# - All application health checks failing
# - Monitoring alert fires
```

**Response Procedure:**

**Phase 1: Initial Response (0-15 minutes)**
```
1. Activate incident command center
2. Page on-call DBA and DevOps lead
3. Notify stakeholders
4. Begin incident log
5. Assess if server can be recovered
```

**Phase 2: Immediate Recovery (15-30 minutes)**
```
Option A: Server Recovery
- SSH to database server
- Check service status
- Review error logs
- Restart database service if safe
- Verify connectivity

Option B: Failover to Replica (if available)
- Switch application connection to replica
- Promote replica to primary
- Verify all connections working

Option C: Restore from Backup
- Provision new database instance
- Restore from latest backup
- Restore transaction logs for point-in-time recovery
```

**Phase 3: Validation (30-60 minutes)**
```
1. Verify all data restored correctly
2. Run data integrity checks
3. Test all application features
4. Verify no data corruption
5. Check transaction logs for anomalies
```

**Phase 4: Failback (if needed)**
```
1. Repair original database server
2. Resync data from current primary
3. Switch back during maintenance window
4. Verify stability
```

### Scenario 2: Data Corruption

**Severity:** HIGH  
**RTO:** 2 hours  
**RPO:** 1 hour

**Detection:**
```bash
# Signs of corruption:
# - Application throwing database errors
# - Referential integrity violations
# - Unexpected NULL values
# - Character encoding errors
```

**Response Procedure:**

```
1. Identify scope of corruption
2. Run data validation queries
3. Isolate affected tables
4. Restore affected tables from backup
5. Verify referential integrity
6. Re-run data validation
7. Monitor for re-occurrence
```

**Validation Queries:**
```sql
-- Check for orphaned records
SELECT o.* FROM orders o 
LEFT JOIN customers c ON o.customer_id = c.id 
WHERE c.id IS NULL;

-- Check referential integrity
ALTER TABLE orders 
ADD CONSTRAINT check_product_fk 
FOREIGN KEY (product_id) REFERENCES products(id);

-- Check for inconsistencies
SELECT * FROM products WHERE price < 0;
SELECT * FROM orders WHERE quantity < 0;
```

### Scenario 3: Application Deployment Failure

**Severity:** HIGH  
**RTO:** 30 minutes  
**RPO:** 0 hours (code-only, no data loss)

**Detection:**
```bash
# Signs:
# - 503 Service Unavailable responses
# - Deployment logs show errors
# - Health checks failing
```

**Response Procedure:**

```
1. Stop deployment process
2. Rollback to previous version
3. Verify service is responding
4. Run smoke tests
5. Investigate root cause
6. Fix and test in staging
7. Schedule new deployment
```

**Rollback Commands:**
```bash
# Frontend
az webapp deployment slot swap -g <resource-group> \
  -n <app-name> --slot <previous-slot>

# Backend
dotnet publish -c Release -o ./publish
# Deploy previous version from backup
```

### Scenario 4: Distributed Denial of Service (DDoS)

**Severity:** CRITICAL  
**RTO:** 15 minutes  
**RPO:** 0 hours

**Detection:**
```bash
# Signs:
# - Abnormal traffic spike
# - Single IP or IP range making excessive requests
# - API latency increasing
# - Error rate spiking
```

**Response Procedure:**

```
1. Activate DDoS response team
2. Enable DDoS protection service
3. Implement rate limiting
4. Block malicious IPs
5. Scale up resources if needed
6. Monitor traffic patterns
7. Maintain normal operations for legitimate users
```

**Mitigation:**
```bash
# Rate limiting (backend)
# Enable CloudFlare DDoS protection
# IP blocking
# WAF rules
# Traffic analysis and filtering
```

### Scenario 5: Data Center Failure

**Severity:** CRITICAL  
**RTO:** 4 hours  
**RPO:** 1 hour

**Detection:**
```bash
# All services in primary data center unreachable
# Monitoring systems unavailable
# Network connectivity lost to DC
```

**Response Procedure:**

**Phase 1: Failover (0-30 minutes)**
```
1. Declare disaster
2. Activate disaster recovery team
3. Verify DR site is operational
4. Fail over to secondary data center:
   - Update DNS records
   - Promote standby database
   - Deploy latest application builds
5. Verify connectivity
6. Confirm users can access system
```

**Phase 2: Validation (30-60 minutes)**
```
1. Run comprehensive health checks
2. Verify all functionality
3. Check data integrity
4. Monitor error rates
5. Confirm user base can access
```

**Phase 3: Communication**
```
1. Inform all stakeholders
2. Provide status updates every 30 minutes
3. Set expectations on recovery timeline
4. Document incident
```

---

## Incident Response Procedures

### Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|----------------|-------------|
| P1 (Critical) | System down, no workaround | 15 minutes | CEO, VP Ops |
| P2 (High) | Core feature unavailable | 30 minutes | Director, VP Eng |
| P3 (Medium) | Degraded performance | 2 hours | Team Lead |
| P4 (Low) | Minor issues | 8 hours | Engineer |

### Incident Command Structure

```
Incident Commander (IC)
├── Communications Lead (stakeholder updates)
├── Technical Lead (resolution strategy)
├── Database Lead (if DB issue)
├── Infrastructure Lead (if infra issue)
└── Documentation Lead (incident log)
```

### Incident Response Checklist

**Immediate (0-5 minutes):**
- [ ] Declare incident
- [ ] Activate incident command
- [ ] Begin incident log with timestamp
- [ ] Gather on-call team
- [ ] Initial status assessment

**Short-term (5-30 minutes):**
- [ ] Identify root cause (if obvious)
- [ ] Start remediation efforts
- [ ] Update stakeholders every 10 minutes
- [ ] Document actions taken
- [ ] Monitor for escalation

**Medium-term (30 minutes - 4 hours):**
- [ ] Continue remediation
- [ ] Hourly stakeholder updates
- [ ] Gather metrics for post-mortem
- [ ] Test fixes before deployment
- [ ] Prepare rollback procedures

**Long-term (Post-Resolution):**
- [ ] Verify system stability (1 hour)
- [ ] Complete incident log
- [ ] Gather team for debrief
- [ ] Schedule post-mortem (within 48 hours)
- [ ] Create action items to prevent recurrence

### Post-Incident Review

**Template:**
```
## Post-Mortem Report

**Date:** [Date]
**Incident:** [Description]
**Duration:** [Start time - End time]
**Severity:** [P1/P2/P3/P4]

### Timeline
- HH:MM - Event happened
- HH:MM - Detection
- HH:MM - Response started
- HH:MM - Root cause identified
- HH:MM - Mitigation applied
- HH:MM - System recovered

### Root Cause Analysis
[Detailed explanation of what caused the incident]

### Impact
- Duration: [X minutes]
- Affected users: [Number/Percentage]
- Data loss: [Yes/No - if yes, how much]
- Financial impact: [If applicable]

### What Went Well
- [Positive aspect 1]
- [Positive aspect 2]

### What Could Be Improved
- [Area for improvement 1]
- [Area for improvement 2]

### Action Items
1. [Action] - Owner: [Name] - Due: [Date]
2. [Action] - Owner: [Name] - Due: [Date]

### Prevention
[Measures to prevent this incident in future]
```

---

## Documentation & Runbooks

### Emergency Runbooks

#### Runbook 1: Database Connection Timeout

```
SYMPTOM: Applications unable to connect to database
ALERT: Database connection errors in logs

IMMEDIATE STEPS:
1. Check database service status
   psql -h <host> -U postgres -d postgres -c "SELECT 1;"
   
2. Verify network connectivity
   ping <db-host>
   telnet <db-host> 5432
   
3. Check connection pool status
   SELECT count(*) FROM pg_stat_activity;
   
4. Check for locks
   SELECT * FROM pg_locks WHERE granted = false;

RESOLUTION OPTIONS:
A) If database is reachable:
   - Kill idle connections: SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
     WHERE idle_in_transaction = true;
   - Restart connection pool on app server
   
B) If database is unreachable:
   - Check firewall rules
   - Verify database server is running
   - Check DNS resolution
   - Failover to replica if available
   
ESCALATION: If not resolved in 15 minutes, page DBA
```

#### Runbook 2: High Memory Usage

```
SYMPTOM: Server memory usage > 90%
ALERT: Memory usage alert triggered

IMMEDIATE STEPS:
1. Identify memory consuming processes
   top -b -n 1 | head -20
   
2. Check database query cache
   SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
   
3. Check application memory
   Get-Process | Sort-Object WorkingSet -Descending | Select -First 5

RESOLUTION:
A) Quick fix:
   - Restart application service
   - Clear cache
   - Kill slow queries
   
B) Lasting fix:
   - Scale up resources
   - Optimize queries
   - Implement query caching
   
ESCALATION: If memory remains > 90% after restart, page infrastructure lead
```

#### Runbook 3: API Returning 503 Errors

```
SYMPTOM: Users cannot access application - 503 Service Unavailable
ALERT: Health check failing, error rate > 5%

IMMEDIATE STEPS:
1. Check application status
   curl -v https://<api-url>/health
   
2. Check application logs
   tail -f /var/log/api/application.log | grep ERROR
   
3. Check service status
   systemctl status api-service
   
4. Check resource availability
   - CPU: top -b -n 1
   - Memory: free -h
   - Disk: df -h

RESOLUTION:
A) If service is down:
   - Start service: systemctl start api-service
   - Verify: systemctl status api-service
   
B) If resources exhausted:
   - Scale up: Increase instance size or add replicas
   - Clear logs: rm /var/log/api/*.log
   - Restart service
   
C) If service runs but health check fails:
   - Check database connectivity
   - Check external service dependencies
   - Review recent deployments
   - Rollback if needed

ESCALATION: If not resolved in 30 minutes, page backend team lead
```

---

## Testing & Validation

### Disaster Recovery Testing Schedule

```
Monthly: (1st Friday of month)
├─ Test database backup restore
├─ Verify backup integrity
├─ Test file restore
└─ Measure actual RTO

Quarterly: (Mid-month)
├─ Full DR site failover test
├─ Test all application features
├─ Verify data accuracy
├─ Test communication procedures
└─ Measure actual RTO/RPO

Annually: (Q4)
└─ Complete simulation of major disaster
  ├─ Fail over to remote location
  ├─ Test all systems
  ├─ Verify business continuity
  ├─ Update procedures if needed
  └─ Document lessons learned
```

### DR Testing Checklist

**Pre-Test:**
- [ ] Notify all stakeholders
- [ ] Backup current production data
- [ ] Document baseline metrics
- [ ] Prepare test environment
- [ ] Brief all team members

**During Test:**
- [ ] Follow actual disaster procedures
- [ ] Measure all timing
- [ ] Document issues encountered
- [ ] Note any deviations from procedures
- [ ] Monitor system behavior

**Post-Test:**
- [ ] Verify data integrity
- [ ] Compare to baseline metrics
- [ ] Generate report
- [ ] Document RTO/RPO achieved
- [ ] Update procedures based on findings
- [ ] Schedule follow-up improvements

---

## Contact Information

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | [Name] | [Phone] | [Email] |
| DBA Lead | [Name] | [Phone] | [Email] |
| DevOps Lead | [Name] | [Phone] | [Email] |
| Backend Lead | [Name] | [Phone] | [Email] |
| Infrastructure Lead | [Name] | [Phone] | [Email] |
| Operations Manager | [Name] | [Phone] | [Email] |

### Escalation Path
```
Initial Alert → Team Lead → Director → VP Engineering → VP Operations → CEO
```

### Communication Channels
- **Slack Channel:** #incident-response
- **Conference Bridge:** [Number]
- **War Room:** [Location/Link]

---

## Appendices

### Appendix A: Common Commands Reference

```bash
# Database backup
pg_dump -h host -U user -d database > backup.sql

# Database restore
psql -h host -U user -d database < backup.sql

# Check database size
SELECT pg_size_pretty(pg_database_size('database_name'));

# Kill slow queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE query LIKE '%slow_query%' AND pid != pg_backend_pid();

# Application restart
systemctl restart api-service
systemctl restart frontend-service

# Service status check
systemctl status api-service
systemctl status frontend-service

# View recent logs
tail -f /var/log/api/application.log
tail -f /var/log/frontend/application.log

# Disk usage check
df -h
du -sh /var/*

# Process monitoring
top -b -n 1
ps aux | grep java
```

### Appendix B: Backup Storage Locations

**Primary Backup (Cloud):**
- Location: `s3://backups/sia102x/daily/`
- Retention: 7 days
- Frequency: Daily full + hourly incremental

**Archive Backup (Cloud):**
- Location: `s3://backups-archive/sia102x/monthly/`
- Retention: 30 days
- Frequency: Monthly

**Offsite Backup (Tape/Cold Storage):**
- Location: [Physical location]
- Retention: 1 year
- Frequency: Monthly

### Appendix C: Disaster Recovery Drill Results

```
Date: [Date]
Scenario: [Scenario tested]
RTO Achieved: [Time]
RPO Achieved: [Time]
Issues Found: [List]
Action Items: [List]
Sign-off: [Signature]
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | May 4, 2026 | DevOps Team | Initial document |
| 1.1 | [Date] | [Author] | [Changes] |

---

**Last Tested:** [Date]  
**Next Test Scheduled:** [Date]  
**Document Approval:** [Signature] [Date]

