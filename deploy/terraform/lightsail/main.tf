locals {
  hostname   = var.subdomain == "" ? var.domain : "${var.subdomain}.${var.domain}"
  public_url = "https://${local.hostname}"
  zone       = var.availability_zone != "" ? var.availability_zone : "${var.aws_region}a"

  key_pair_name = var.ssh_key_pair_name != "" ? var.ssh_key_pair_name : aws_lightsail_key_pair.this[0].name

  # Everything the instance needs to answer on. The runtime's port is deliberately absent: it is
  # only reachable from inside the container, through the admin server's /runtime prefix.
  public_ports = concat(
    [for cidr in var.ssh_allowed_cidrs : {
      protocol = "tcp"
      from     = 22
      to       = 22
      cidrs    = [cidr]
    }],
    [
      { protocol = "tcp", from = 80, to = 80, cidrs = ["0.0.0.0/0"] },
      { protocol = "tcp", from = 443, to = 443, cidrs = ["0.0.0.0/0"] },
    ],
  )
}

# Lightsail generates the key pair when no public key is supplied, and the private half ends up in
# this module's state. Treat the state file as a secret.
resource "aws_lightsail_key_pair" "this" {
  count = var.ssh_key_pair_name == "" ? 1 : 0

  name = "${var.project_name}-key"
}

resource "aws_lightsail_instance" "this" {
  name              = var.project_name
  availability_zone = local.zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  key_pair_name     = local.key_pair_name

  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    host_dir     = var.host_dir
    public_url   = local.public_url
    hostname     = local.hostname
    ssh_user     = var.ssh_user
    swap_size_mb = var.swap_size_mb
  })

  tags = var.tags
}

resource "aws_lightsail_static_ip" "this" {
  name = "${var.project_name}-ip"
}

resource "aws_lightsail_static_ip_attachment" "this" {
  static_ip_name = aws_lightsail_static_ip.this.name
  instance_name  = aws_lightsail_instance.this.name
}

resource "aws_lightsail_instance_public_ports" "this" {
  instance_name = aws_lightsail_instance.this.name

  dynamic "port_info" {
    for_each = local.public_ports

    content {
      protocol  = port_info.value.protocol
      from_port = port_info.value.from
      to_port   = port_info.value.to
      cidrs     = port_info.value.cidrs
    }
  }
}
