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

