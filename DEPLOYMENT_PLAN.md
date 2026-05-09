# Deployment Plan and Procedures
## SIA102x E-Commerce System

**Version:** 1.0  
**Last Updated:** May 4, 2026  
**Document Owner:** Development Team

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Architecture](#deployment-architecture)
4. [Frontend Deployment Procedure](#frontend-deployment-procedure)
5. [Backend Deployment Procedure](#backend-deployment-procedure)
6. [Database Deployment Procedure](#database-deployment-procedure)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Deployment Timeline](#deployment-timeline)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

The SIA102x system is a comprehensive e-commerce platform consisting of:

- **Frontend:** React-based dashboard with Vite build tool
- **Backend:** C# ASP.NET Core API
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with JWT tokens
- **Features:** Product management, order tracking, inventory management, sales analytics, employee management

### Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | C# .NET 6+, ASP.NET Core |
| Database | PostgreSQL (Supabase) |
| Authentication | Supabase Auth |
| Deployment | Azure/Cloud Provider (specify) |

---

## Pre-Deployment Checklist

**Code Review & Testing:**
- [ ] All code changes reviewed and approved
- [ ] Unit tests passing (90%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests completed
- [ ] Security scanning completed (SAST/DAST)
- [ ] Performance tests passed
- [ ] Database migrations tested in staging

**Environment Preparation:**
- [ ] Production environment credentials secured in vault
- [ ] API endpoints configured
- [ ] Database connection strings validated
- [ ] Environment variables documented
- [ ] SSL certificates valid and updated
- [ ] CDN cache cleared (if applicable)

**Communication & Approval:**
- [ ] Deployment window scheduled and communicated
- [ ] Stakeholders notified
- [ ] Support team briefed on changes
- [ ] Rollback plan reviewed
- [ ] Approvals obtained from team lead

**Data & Backups:**
- [ ] Full database backup created
- [ ] Backup verified and tested
- [ ] Production data snapshot taken
- [ ] Release notes prepared

---

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│         Production Environment               │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │      CDN / Load Balancer             │  │
│  └──────────┬───────────────────────────┘  │
│             │                               │
│    ┌────────┼────────┐                      │
│    │        │        │                      │
│  ┌─▼──┐  ┌─▼──┐  ┌─▼──┐                   │
│  │FE 1 │  │FE 2 │  │FE 3 │   (Frontend)   │
│  └────┘  └────┘  └────┘                   │
│                                              │
│    ┌────────────────────────┐               │
│    │   API Gateway          │               │
│    └────────┬───────────────┘               │
│             │                               │
│    ┌────────┼────────┐                      │
│    │        │        │                      │
│  ┌─▼──┐  ┌─▼──┐  ┌─▼──┐                   │
│  │API 1 │  │API 2 │  │API 3 │  (Backend)  │
│  └────┘  └────┘  └────┘                   │
│                                              │
│         ┌──────────────────┐               │
│         │   Supabase DB    │               │
│         │   (PostgreSQL)   │               │
│         └──────────────────┘               │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Frontend Deployment Procedure

### Prerequisites
- Node.js 18+ installed
- npm packages up to date
- Build artifacts ready

### Step 1: Build the Frontend
```bash
cd "c:\Users\ADZ\Documents\GitHub\SIA102x - Copy"
npm install
npm run build
```

**Expected Output:**
- Build directory created with optimized files
- No build errors or critical warnings
- Bundle size within acceptable limits

### Step 2: Pre-deployment Validation
```bash
# Verify build artifacts
dir dist/

# Check for source maps in production (should not exist)
# Verify all static assets are included
```

### Step 3: Deploy to Hosting Platform

**For Azure Static Web Apps:**
```bash
# Deploy using Azure CLI
az staticwebapp upload --app-location "dist" --app-name "<app-name>"
```

**For Other Platforms:**
Follow your hosting provider's specific deployment instructions.

### Step 4: Update DNS/CDN
- Flush CDN cache
- Update DNS records if needed
- Verify DNS propagation

### Step 5: Verification
- Access application URL
- Clear browser cache and reload
- Verify all static resources load
- Check console for JavaScript errors

---

## Backend Deployment Procedure

### Prerequisites
- Visual Studio or .NET CLI installed
- Backend solution builds without errors
- All dependencies updated

### Step 1: Build the Backend
```bash
cd "c:\Users\ADZ\Documents\GitHub\SIA102x - Copy\src\backend"
dotnet restore
dotnet build -c Release
```

### Step 2: Run Tests
```bash
dotnet test --configuration Release
```

### Step 3: Create Deployment Package
```bash
dotnet publish -c Release -o ./publish
```

### Step 4: Deploy to Hosting Platform

**For Azure App Service:**
```bash
# Using Azure CLI
az webapp deployment source config-zip \
  --resource-group "<resource-group>" \
  --name "<app-service-name>" \
  --src-path publish.zip
```

**For Docker:**
```bash
docker build -t sia102x-backend:latest .
docker push <registry>/sia102x-backend:latest
# Update orchestration platform (K8s, Docker Compose, etc.)
```

### Step 5: Configure Environment Variables
```bash
# Set in production environment
ASPNETCORE_ENVIRONMENT=Production
DATABASE_CONNECTION_STRING=<connection-string>
JWT_SECRET=<secret-key>
SUPABASE_URL=<supabase-url>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-key>
```

### Step 6: Verify Deployment
```bash
# Health check endpoint
curl https://<api-url>/health

# Check logs
# Platform-specific log retrieval
```

---

## Database Deployment Procedure

### Prerequisites
- Database backup created and tested
- All migrations reviewed
- Rollback SQL scripts prepared

### Step 1: Backup Current Database
```bash
# Using Supabase CLI
supabase db pull --db-url "<production-db-url>"

# Or manual backup
pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Test Migrations in Staging
```bash
# Create staging environment copy
# Run all migrations against staging
# Verify data integrity and application functionality
```

### Step 3: Execute Migrations
```bash
# Using Entity Framework Core
cd src/backend
dotnet ef database update --configuration Release

# Or using Supabase migrations
supabase db push
```

### Step 4: Verify Migration Success
```bash
# Check all tables exist
# Verify data integrity
# Run data validation queries
# Check for any constraint violations
```

### Step 5: Update Database Indexes (if needed)
```sql
-- Performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
```

---

## Post-Deployment Verification

### Automated Checks

**Frontend Verification:**
```bash
# Check all endpoints are accessible
curl -I https://<frontend-url>/
curl -I https://<frontend-url>/admin
curl -I https://<frontend-url>/dashboard

# Verify API calls work
curl https://<api-url>/api/products
curl https://<api-url>/api/health
```

**Backend Verification:**
```bash
# Health check
curl https://<api-url>/health

# Test main endpoints
curl https://<api-url>/api/products
curl https://<api-url>/api/customers
curl https://<api-url>/api/orders
```

### Manual Testing Checklist

- [ ] User login/registration works
- [ ] Dashboard displays correctly
- [ ] Product listing functional
- [ ] Shopping cart operations work
- [ ] Order placement successful
- [ ] Admin functions accessible
- [ ] Inventory management functional
- [ ] Reports generate correctly
- [ ] File uploads work (images)
- [ ] Payment processing functional (if applicable)
- [ ] Email notifications sent (if applicable)

### Performance Monitoring

Monitor for 24 hours:
- API response times
- Error rates
- CPU and memory usage
- Database query performance
- User login success rates
- Transaction completion rates

---

## Rollback Procedures

### Immediate Rollback (if critical issues found within 1 hour)

**Step 1: Stop the Deployment**
```bash
# Immediately halt any ongoing deployment processes
```

**Step 2: Revert Frontend**
```bash
# Deploy previous version from backup/CDN
# Clear CDN cache
# Revert DNS changes if applicable
```

**Step 3: Revert Backend**
```bash
# Deploy previous API version
# Restart application services
```

**Step 4: Database Rollback**
```bash
# If migrations were executed:
dotnet ef database update <previous-migration-name>

# Or restore from backup:
psql -h <host> -U <user> -d <database> < backup_file.sql
```

**Step 5: Verify Rollback Success**
- Confirm previous version is running
- Verify all endpoints operational
- Check data integrity
- Monitor error rates

### Partial Rollback (specific components)

If only one component failed:

**Frontend Only:**
```bash
# Revert frontend to previous build
# Keep backend and database as-is
```

**Backend Only:**
```bash
# Revert API to previous version
# Keep frontend and database as-is
# Re-run compatibility tests
```

---

## Deployment Timeline

### Standard Deployment Window: 2-3 hours

| Phase | Duration | Owner |
|-------|----------|-------|
| Pre-deployment checks | 15 min | DevOps/QA |
| Database migrations | 30 min | DBA |
| Backend deployment | 20 min | DevOps |
| Frontend deployment | 15 min | DevOps |
| Health checks | 10 min | QA |
| Monitoring setup | 10 min | DevOps |
| Go-live verification | 20 min | QA/Product |
| Buffer for issues | 15 min | All |

### Deployment Schedule

- **Preferred Time:** 2:00 AM - 5:00 AM (Low traffic period)
- **Avoid:** Business hours, weekends, holidays
- **Notification:** 48 hours in advance to all stakeholders

---

## Troubleshooting

### Common Deployment Issues

#### Frontend: Blank page or 404 errors
```bash
# Solution: Check build artifacts
# 1. Verify dist/ folder contains files
# 2. Check static file serving configuration
# 3. Clear browser cache and CDN cache
# 4. Check for JavaScript console errors
```

#### Backend: API returning 503 Service Unavailable
```bash
# Solution: Check service status
# 1. Verify application service is running
# 2. Check database connection
# 3. Review application logs
# 4. Check resource availability (CPU, memory)
```

#### Database: Connection timeout errors
```bash
# Solution: Database connectivity
# 1. Verify connection string
# 2. Check network connectivity to database
# 3. Verify firewall rules
# 4. Check database service status
```

#### Migration: Pending migrations or constraint violations
```bash
# Solution: Migration issues
# 1. Review migration SQL
# 2. Check for conflicting changes
# 3. Verify data types and constraints
# 4. Execute migration in staging first
```

### Emergency Contacts

| Role | Contact | Phone |
|------|---------|-------|
| DevOps Lead | [Name] | [Phone] |
| DBA | [Name] | [Phone] |
| Backend Lead | [Name] | [Phone] |
| Frontend Lead | [Name] | [Phone] |
| Operations Manager | [Name] | [Phone] |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Deployment Lead | | | |
| Technical Lead | | | |
| Product Manager | | | |
| Operations Manager | | | |

---

**Document Version Control:**
- v1.0 - Initial deployment plan (May 4, 2026)
