CREATE TABLE IF NOT EXISTS events (
  tenant_id  String,
  event      String,
  user_id    String DEFAULT '',
  session_id String DEFAULT '',
  properties String,
  ts         DateTime64(3)
) ENGINE = MergeTree() ORDER BY (tenant_id, ts, user_id, session_id);
