# pi5cluster

## pi0 - router
Use the Raspberry Pi imager to image pi0.local
- Device: Raspberry Pi 5, OS: Raspberry Pi OS Lite (64-bit), Storage: SD card
- Edit Settings
  - Set hostname to pi0.local
  - Uncheck username and password
  - Configure wireless lan
  - Set locale settings
  - Under Services, enable SSH, allow public-key auth only, and paste in public key

Before using it, enable USB boot even on 3A power:
```
nano /Volumes/bootfs/config.txt
```

paste the following lines in to the existing file:
```
# allow usb boot even on 3a power
usb_max_current_enable=1
```


pi0 will be setup as the router, as follows:

```
sudo apt update
sudo apt upgrade
# check locale and datetime
locale
# run if wrong:
sudo dpkg-reconfigure locales
# check timezone
timedatectl
# change timezone if wrong:
sudo timedatectl set-timezone America/New_York
# use NetworkManager, which is installed by default on Raspberry Pi OS
nmcli device status
# Configure the LAN interface assuming eth0 is your LAN interface.
sudo nmcli con add type ethernet con-name lan ifname eth0
sudo nmcli con modify lan ipv4.addresses '192.168.87.1/24'
sudo nmcli con modify lan ipv4.method manual
# enable ip forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
# Set Up NAT with iptables
sudo apt install iptables-persistent
sudo iptables -t nat -A POSTROUTING -o wlan0 -j MASQUERADE
sudo netfilter-persistent save
# install dhcp server
sudo apt install dnsmasq
# Edit /etc/dnsmasq.conf
# first move the existing one. it only contains comments.
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.BAK.conf
sudo nano /etc/dnsmasq.conf
# Add the following lines to a new blank /etc/dnsmasq.conf
interface=eth0
dhcp-range=192.168.87.2,192.168.87.100,255.255.255.0,24h



# restart dnsmasq
sudo systemctl restart dnsmasq
# apply all configurations
sudo systemctl restart NetworkManager

# Static IPs
cat /var/lib/misc/dnsmasq.leases
sudo nano /etc/dnsmasq.conf
# Add lines that look like:
# pi1
dhcp-host=d8:3a:dd:f7:78:e0,192.168.87.101,pi1

# pi2
dhcp-host=d8:3a:dd:f7:77:d8,192.168.87.102,pi2



#TODO: IPv6
#chatgpt prompt: I'm following these steps to configure my headless raspberry pi as a router. Do I need to do anything differently if I also want everything to work for ipv6?. And then paste in all of the above.
```


## pi1 .. piN cluster servers

Use the Raspberry Pi imager to image pi1.local through piN.local
- Follow the same steps as above, but uncheck Configure wireless lan

Connect this pi to the same switch as pi0 and power up

```
# from laptop, proxyjump to pi1
ssh -J pi@pi0.local pi@pi1.local
sudo apt update
sudo apt upgrade
# check locale and datetime
locale
# run if wrong:
sudo dpkg-reconfigure locales
# check timezone
timedatectl
# change timezone if wrong:
sudo timedatectl set-timezone America/New_York
```
Disable Wifi
```
sudo nano /boot/firmware/config.txt
# paste the following line
dtoverlay=disable-wifi
# Save, then reboot
sudo reboot
```

Test as follows:
```
ssh pi@pi0.local
# check the dhcp leases
cat /var/lib/misc/dnsmasq.leases
ping <ip-address-of-pi1>
exit
```
```
# ping router from pi1
ping 192.168.87.1
# ping external site from pi1
ping www.cnn.com
```

## Benchmarking

https://www.tomshardware.com/how-to/raspberry-pi-benchmark-vcgencmd

## NAS
This is setup on my NUC (aka nucnas.local). Did as follows:

Installed Ubuntu Server 22.04.3 LTS using balenaEtcher to create a bootable USB and going through the install. First time through failed, but after upgrading the installer (which is an optional step in the install process itself), things went smoothly.

Through my home router, I gave nucnas a reserved IP

Then, I ran these commands:
```
sudo apt update
sudo apt upgrade
```

Create, format, and permanently mount the new logical volume:
```
sudo lvcreate -n nfs-lv -L 1.5T ubuntu-vg
sudo mkfs.ext4 /dev/ubuntu-vg/nfs-lv
sudo mkdir /mnt/nfsnas
sudo chmod 777 /mnt/nfsnas
sudo mount /dev/ubuntu-vg/nfs-lv /mnt/nfsnas
sudo nano /etc/fstab
# Add this line to the end of the file
/dev/ubuntu-vg/nfs-lv /mnt/nfsnas ext4 defaults 0 2
```
Install and configure the NFS server:
```
sudo apt install nfs-kernel-server
sudo nano /etc/exports
# Add this line to the file
/mnt/nfsnas *(rw,sync,no_subtree_check)

# start and enable the server
sudo systemctl start nfs-kernel-server
sudo systemctl enable nfs-kernel-server
# Apply the export settings
sudo exportfs -a
```
#### Permanently mount from one of the pis
```
sudo mkdir -p /mnt/nfsnas
sudo nano /etc/fstab
# Add this line
192.168.86.5:/mnt/nfsnas /mnt/nfsnas nfs defaults 0 0


sudo mount -a
df -h

```

#### Note: mounting from Mac required the `resvport` option
```
sudo mount -t nfs -o resvport 192.168.86.5:/mnt/nfsnas ~/dev/nfsnas
```



## Proxmox
https://github.com/jiangcuo/Proxmox-Port

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
127.0.0.1	localhost
::1		localhost ip6-localhost ip6-loopback
ff02::1		ip6-allnodes
ff02::2		ip6-allrouters

192.168.86.200	pi0
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


Continue following steps from https://github.com/jiangcuo/Proxmox-Port/wiki/Install-Proxmox-VE-on-Debian-bookworm, using `sudo`, like this:
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
Make it look like this (https://pve.proxmox.com/wiki/Network_Configuration):
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
https://github.com/jiangcuo/Proxmox-Arm64/wiki/Qemu-VM
Tips:
- OVMF UEFI
- recommend configured virtio-scsi-pci (VirtIO SCSI)
