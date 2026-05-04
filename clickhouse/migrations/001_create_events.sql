CREATE TABLE IF NOT EXISTS default.events (
  tenant_id  String,
  event      String,
  properties String DEFAULT '{}',
  ts         DateTime64(3) DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (tenant_id, ts);
