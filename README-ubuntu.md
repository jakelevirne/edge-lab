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
