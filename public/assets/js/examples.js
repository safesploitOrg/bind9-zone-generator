export const HOSTS_EXAMPLE = '192.0.2.53 ns1\n192.0.2.10 app www portal\n192.0.2.20 db database';
export const BIND_EXAMPLE = `$ORIGIN example.com.
$TTL 5m
@ IN SOA ns1.example.com. hostmaster.example.com. (
  2026103000 1h 15m 1w 1d )
  IN NS ns1.example.com.
ns1 IN A 192.0.2.53
app IN A 192.0.2.10
www IN CNAME app
portal IN CNAME www
db  IN A 192.0.2.20
database IN CNAME db
@ IN TXT "Other DNS records are reported and omitted"`;
