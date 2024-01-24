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
