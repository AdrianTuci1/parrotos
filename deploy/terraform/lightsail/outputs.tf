output "public_url" {
  description = "Origin the app answers on. Put this in STATSPARROT_SERVE_PUBLIC_URL."
  value       = local.public_url
}

output "hostname" {
  description = "Hostname Caddy requests a certificate for. Put this in STATSPARROT_DOMAIN."
  value       = local.hostname
}

output "static_ip" {
  description = "The instance's static IP, and the value of the A record."
  value       = aws_lightsail_static_ip.this.ip_address
}

output "instance_name" {
  description = "Lightsail instance name."
  value       = aws_lightsail_instance.this.name
}

output "ssh_command" {
  description = "Log in to the instance."
  value       = "ssh ${var.ssh_user}@${aws_lightsail_static_ip.this.ip_address}"
}

output "private_key_pem" {
  description = "Private key for the generated key pair. Empty when ssh_key_pair_name was set. Write it to a file with: terraform output -raw private_key_pem > deploy/terraform/lightsail/lightsail.pem && chmod 600 <file>"
  value       = var.ssh_key_pair_name == "" ? aws_lightsail_key_pair.this[0].private_key : ""
  sensitive   = true
}

output "next_steps" {
  description = "What to do after apply."
  value       = <<-EOT
    1. Fill in deploy/hosted/.env: STATSPARROT_SERVE_PUBLIC_URL=${local.public_url}
       and STATSPARROT_DOMAIN=${local.hostname}.
    2. Wait for cloud-init to finish installing Docker:
         ssh ${var.ssh_user}@${aws_lightsail_static_ip.this.ip_address} 'cloud-init status --wait'
    3. Ship the app:  ./deploy/hosted/deploy.sh --host ${aws_lightsail_static_ip.this.ip_address}
  EOT
}
