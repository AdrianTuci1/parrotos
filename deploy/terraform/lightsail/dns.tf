# The A record is the only thing in Cloudflare this module manages. Caddy obtains its own
# certificate over this record, so nothing else in the zone has to change.
resource "cloudflare_dns_record" "app" {
  count = var.enable_dns ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = local.hostname
  type    = "A"
  content = aws_lightsail_static_ip.this.ip_address
  # Cloudflare forces TTL "auto" on proxied records, and a proxied record is the one case where
  # a short TTL is not what you want.
  ttl     = var.cloudflare_proxied ? 1 : 300
  proxied = var.cloudflare_proxied
  comment = "statsparrot hosted app"
}
