CREATE TABLE IF NOT EXISTS events (
  tenant_id  String,
  event      String,
  properties String,
  ts         DateTime64(3)
) ENGINE = MergeTree() ORDER BY (tenant_id, ts);
