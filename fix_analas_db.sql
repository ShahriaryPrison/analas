UPDATE "Workspace" 
SET plan = 'PRO', 
    "internalSubscriptionId" = '32', 
    "billingCycleStart" = NOW(), 
    "currentPeriodEnd" = NOW() + INTERVAL '30 days'
WHERE id = 'cmoy4wdec000801mhetorgf8z';
