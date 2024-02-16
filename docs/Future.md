# Ideas for the Future

- Use network boot instead of SD cards for machine re-imaging
- Ensure IPv6 is all fully configured



## Proxmox

[GitHub - jiangcuo/Proxmox-Port: Proxmox VE arm64 riscv64 loongarch64](https://github.com/jiangcuo/Proxmox-Port)

```
sudo mkdir -p ~/mnt/mmcblk0p1
sudo mount /dev/mmcblk0p1 ~/mnt/mmcblk0p1

# in config.txt:
kernel=kernel8.img
```

```
# in cmdline.txt, add to the end of the line:
cgroup_enable=cpuset cgroup_enable=memory cgroup_memory=1
```

Modify `/etc/hosts` like:

```
127.0.0.1    localhost
::1        localhost ip6-localhost ip6-loopback
ff02::1        ip6-allnodes
ff02::2        ip6-allrouters

192.168.86.200    pi0
```

REBOOT

Test

```
hostname --ip-address
```

Should return your IP address

Set your root password (this is what proxmox uses for it's initial admin user)

```
sudo su
passwd
```

Continue following steps from [Install Proxmox VE on Debian bookworm · jiangcuo/Proxmox-Port Wiki · GitHub](https://github.com/jiangcuo/Proxmox-Port/wiki/Install-Proxmox-VE-on-Debian-bookworm), using `sudo`, like this:

```
sudo sh -c 'echo "deb [arch=arm64] https://mirrors.apqa.cn/proxmox/debian/pve bookworm port" > /etc/apt/sources.list.d/pveport.list'

sudo curl https://mirrors.apqa.cn/proxmox/debian/pveport.gpg -o /etc/apt/trusted.gpg.d/pveport.gpg

sudo apt update && sudo apt full-upgrade

sudo apt install ifupdown2

sudo apt install proxmox-ve postfix open-iscsi

# Disable NetworkManager
sudo systemctl stop NetworkManager
sudo systemctl disable NetworkManager

sudo nano /etc/network/interfaces
```

Make it look like this ([Network Configuration - Proxmox VE](https://pve.proxmox.com/wiki/Network_Configuration)):

```
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet manual

auto vmbr0
iface vmbr0 inet static
    address 192.168.87.101/24
    gateway 192.168.87.1
    bridge-ports eth0
    bridge-stp off
    bridge-fd 0
```

REBOOT

Configure port 8006 forwarding from pi0 to pi1 for proxmox admin UI

```
sudo iptables -t nat -A PREROUTING -p tcp --dport 8006 -j DNAT --to-destination 192.168.87.101:8006
sudo iptables -A FORWARD -p tcp -d 192.168.87.101 --dport 8006 -j ACCEPT
sudo netfilter-persistent save
```

### Running a VM

[Qemu VM · jiangcuo/Proxmox-Arm64 Wiki · GitHub](https://github.com/jiangcuo/Proxmox-Arm64/wiki/Qemu-VM)  
Tips:

- OVMF UEFI
- recommend configured virtio-scsi-pci (VirtIO SCSI)
