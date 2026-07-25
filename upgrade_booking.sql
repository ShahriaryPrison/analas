UPDATE "Workspace" 
SET plan = 'PRO', 
    "billingCycleStart" = NOW(), 
    "currentPeriodEnd" = NOW() + INTERVAL '30 days'
WHERE id = 'cmpwqwygm000601odeg4v38pl';
