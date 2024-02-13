# Building the Raspberry Pi Cluster

Here we'll build a cluster of four Raspberry Pis. The cluster will have it's own subnet and one of the Pis (pi0) will act as a router to bridge this lab subnet[^1] to our home subnet (the one connected to the internet). Though inefficient, we'll use pi0's wireless network adapter to connect to the home internet router and we'll use pi0's ethernet adapter to connect to the lab subnet switch.

## Goals

- The cluster should be able to run K8s, RedPanda (Kafka) and all the other tools we want.

- It should be fast and easy to get the cluster back to a clean initial state.

- We should be able to administer the cluster fully remotely, with no need to physically interact with it (e.g. put it in a closet).

## Parts

- Four Raspberry Pis, one for the router (pi0) and three for the cluster (pi1..pi3). I use Raspberry Pi 5s. Other versions may work but haven't been tested.

- Full 27 watt power supplies (5.1V, 5a). Given our desire to USB boot, this is the best way to ensure stability.

- A basic switch. I use the [TP-Link TL-SG108PE • 8 Port Gigabit PoE Switch](https://www.amazon.com/gp/product/B01BW0AD1W). But because of the Pi 5's power requirements I haven't had consistent success with power over ethernet (PoE).

- SD Cards, one for each Pi. I use [128GB Amazon Basics Micro SDXC](https://www.amazon.com/gp/product/B08TJRVWV1) though 64GB cards would've been sufficient.

- USB Drive, one for each PI. I use [500GB Samsung T7s](https://www.amazon.com/gp/product/B0874Y1FZZ) for pi1..pi3, which run pretty fast, and a [128GB Thkailar USB stick](https://www.amazon.com/gp/product/B07SW2S5XX), which does not. See [Performance](Performance.md) for benchmarking.

## Network

192.168.86.0/24 is our home LAN subnet and 192.168.87.0/24 is our Edge Lab subnet. pi0, once setup properly, will be the router that serves as a bridge between the Lab and Home networks. It will allow all the Pis in the cluster to access the internet and it will allow machines and devices in the Home LAN select access to the cluster.

![](../media/edge-lab-network.svg)

[^1]: [ChatGPT-What's a subnet? What does 192.168.86.0/24 mean? Is there something special about 192.168?](https://chat.openai.com/share/d146774e-6da8-48c8-8bc5-88791f5e4ad4)

## Prepare Cluster

One of the goals for this cluster is to be able to wipe it clean to quickly get it back to its initial state without having to physically touch the machines. This allows us to play and experiment more easily. We'll use an approach of enabling each of the Pis to dual-boot, either into the USB drive for normal operations or into the SD card when we need to re-image the machines. This setup requires several one-time steps.

### Set all Pis to USB Boot Mode preference

While there are several ways to change the [boot order](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#BOOT_ORDER) of the Pis, the most consistent approach I've found is to use [Raspberry Pi Imager](https://github.com/raspberrypi/rpi-imager) to create an SD card with the USB Boot bootloader EEPROM config. 

Start the imager, select your device (Raspberry Pi 5), for Operating System choose `Misc utility images` → `Bootloader` → `USB Boot`. Choose Storage and select your SD card.

With everything else disconnected, put this SD card into each Pi one by one, powering each one up in turn. Look for the green blinking light on the Pi to indicate the the bootloader flashed appropriately. (If you happen to have a monitor connected, you'll see the monitor show green).

This will set each Pi to prefer the USB device for booting. But the Pis will still boot from an SD card if the USB device is not present or bootable. We'll use this fact to allow us to change the boot disk when needed.

### Create `imager` SD cards

We'll leave SD cards in each of the Pis that can be used whenever needed to re-image the attached USB drives. During normal operation, these SD cards won't be used. But whenever a Pi has no bootable USB drive attached, the `imager` SD card will kick in as the boot device.

For each device, pi0 ... pi3, use the Raspberry Pi Imager to create these SD cards. 

Start the imager, select your device (Raspberry Pi 5), for Operating System choose `Raspberry Pi OS (other)` → `Raspberry Pi OS Lite (64-bit)`. Choose Storage and select your SD card. Hit Next.

Customize the OS by choosing `Edit Settings` and then select the following options:

- ☑ Set hostname: `imager0`.local
  
  - For each of the cards, this is the only thing that changes. Use `imager1`, `imager2`, `imager3` for the next three.

- ☐ Set username and password (leave unchecked)

- ☑ Configure wireless LAN
  
  - Set your home router's SSID and password
  
  - Set your Wireless LAN country
  
  - (When in imaging mode, the Pis will connect to your home LAN)

- ☑ Set local settings
  
  - Enter your timezone and keyboard layout

- Click the Services tab

- ☑ Enable SSH
  
  - Allow public-key authentication only (it's more secure)
  
  - Paste in your public key
  
  - Go back to the General tab and make sure 'Set username and password' is still unchecked

SSH key setup is a complex topic in and of itself. If you don't already have and use SSH keys, then this [tutorial](https://www.digitalocean.com/community/tutorials/how-to-create-ssh-keys-with-openssh-on-macos-or-linux) walks through the process of creating new ones. If you change any of the defaults during key generation (e.g. a different key filename or non-blank passphrase), you should edit/create your `~/.ssh/config` file to match. For example, mine looks like this because I have a custom identity filename, and I used a passphrase, and I'm on a Mac which let's me use the Keychain to store the passphrase:

```bash
Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_default
```

For more help, ask the [Edge Lab Assistant](https://chat.openai.com/g/g-CCcHNwSF9-edge-lab-assistant) I created in ChatGPT. 

### Setup an NFS device

You'll need a location for storing your clean disk images. One option would be another USB drive that you plug in and out of each of the machines when imaging. But that defeats our goal of fully remote cluster management. Instead we'll setup an NFS share. In my lab, an Intel NUC acts as an NFS server and a database server. Follow the instructions for setting up the [Storage Server](<Storage Server.md>).

Alternatively, you could setup an NFS share from your laptop. For more help, ask the [Edge Lab Assistant](https://chat.openai.com/g/g-CCcHNwSF9-edge-lab-assistant).

### Create Clean Images

The general approach we take here for resetting the cluster is cloning and restoring clean disk images using Clonezilla. The reason for this choice is that Clonezilla is nicely scriptable from the command line while other tools, like the [Raspberry Pi Imager](https://github.com/raspberrypi/rpi-imager) or [balenaEtcher](https://etcher.balena.io/) are not.

## pi0 - router

This Raspberry Pi will be used as the network router, bridging the Edge and Home subnets. It shouldn't need as much storage as the cluster nodes, so we'll use the 128 GB USB stick for it. Like all the Pis in the cluster, we use two storage device (SD card and USB) in order to create an imag

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

Or better yet, after SSHing into pi0, change the EEPROM [bootloader config](https://forums.raspberrypi.com/viewtopic.php?t=359453) to always allow usb boot even on 3a power and to prefer USB [boot order](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#BOOT_ORDER):

```
sudo rpi-eeprom-config --edit
# Edit it to look like this (USB preferred boot order and USB max current enabled):
[all]
BOOT_UART=1
BOOT_ORDER=0xf146
POWER_OFF_ON_HALT=0
[config.txt]
[all]
usb_max_current_enable=1
```

```
sudo reboot
# check the change by running:
vcgencmd bootloader_config
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
# In general, I prefer using reserved IPs from a DHCP server rather than static IP addresses configured separately on each machine.
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

## Checking for boot errors

```bash
journalctl -p err -b
```

## Benchmarking

[How to Benchmark a Raspberry Pi Using Vcgencmd | Tom's Hardware](https://www.tomshardware.com/how-to/raspberry-pi-benchmark-vcgencmd)

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

## Setting Up Remote SSH with Cloudflare Tunnel

[SSH · Cloudflare Zero Trust docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/use-cases/ssh/)

## Powering Up Cluster

[Getting started &mdash; python-kasa documentation](https://python-kasa.readthedocs.io/en/stable/index.html)

```bash
pip install python-kasa
kasa discover
kasa --host <ip address> <command>
```
