# For Ubuntu Server pi cluster setup.

## pi0 (router)

`sudo nano /etc/netplan/01-netcfg.yaml`

The contents of the file should be:
```
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: no
      dhcp6: no
      addresses: [192.168.87.1/24]
      accept-ra: no
```

```
sudo chmod 600 /etc/netplan/01-netcfg.yaml
sudo netplan apply
```

```
sudo nano /etc/sysctl.conf
```

Add these lines (the rest of the file should be all commented out):
```
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1
```

Apply the changes with:
```
sudo sysctl -p
```

For DHCP:
```
sudo apt update
sudo apt install isc-dhcp-server
```
Configure the DHCP server
```
sudo nano /etc/dhcp/dhcpd.conf
```
Contents should be:
```
subnet 192.168.87.0 netmask 255.255.255.0 {
  range 192.168.87.10 192.168.87.100;
  option domain-name-servers 8.8.8.8, 8.8.4.4;
  option routers 192.168.87.1;
}

```
```
sudo nano /etc/default/isc-dhcp-server
```
Contents should be:
```
INTERFACESv4="eth0"
INTERFACESv6="eth0"
```

```
sudo systemctl restart isc-dhcp-server
sudo systemctl enable isc-dhcp-server
```

Configure NAT and firewall rules
(nftables nft command is already installed by default in Ubunut 23)

```
sudo nano /etc/nftables.conf
```

Ensure contents contains:
```
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        # Allow localhost traffic
        iif lo accept
        # Allow established and related traffic
        ct state established,related accept
        # Drop invalid packets
        ct state invalid drop
        # Your additional input rules here (e.g., allow SSH)
        # tcp dport 22 accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
        # Allow forwarding from eth0 to wlan0
        iif eth0 oif wlan0 accept
        # Allow established and related connections back into eth0
        iif wlan0 oif eth0 ct state established,related accept
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}

table ip nat {
    chain prerouting {
        type nat hook prerouting priority -100;
    }

    chain postrouting {
        type nat hook postrouting priority 100;
        # Masquerade traffic going out of wlan0
        oif "wlan0" masquerade
    }
}
```

Apply and verify the configuration:
```
sudo nft -f /etc/nftables.conf
sudo nft list ruleset
```

```
