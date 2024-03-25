CREATE TABLE temp (
  temp int,
  proc_time timestamptz as proctime()
)
WITH (
  connector = 'mqtt',
  url = 'mqtt://192.168.87.250',
  topic = 'topic1'
) FORMAT PLAIN ENCODE JSON;

CREATE SOURCE temp_src (
    temp int,
    proc_time timestamptz as proctime()
)
WITH (
  connector = 'mqtt',
  url = 'mqtt://192.168.87.250',
  topic = 'topic1'
) FORMAT PLAIN ENCODE JSON;


CREATE MATERIALIZED VIEW temp_times_30 AS
SELECT window_start, window_end, count(temp) as no_of_datapoints, max(temp) as highest_temp, min(temp) as lowest_temp 
FROM TUMBLE (temp, proc_time, INTERVAL '30 SECONDS') 
GROUP BY window_start, window_end;


