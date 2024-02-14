# Storage Server

This will be a database and NFS server, running on an Intel NUC. It consists of two 2TB hard drives (one SATA SSD and one m.2 NVME) that will be configured as software RAID1[^1]. Other server hardware will work, but some steps of the configuration will be different.

During initial setup of this storage server, it will live in both subnets (Home and Lab) just like pi0. But after inital setup, we'll disable the wireless interface so it is appropriately contained just on the Lab network.

[^1]: [ChatGPT-What's software RAID1? How do I configure it on an Ubuntu server?](https://chat.openai.com/share/e21c6e66-5713-4017-bfa3-818ee7dff6ce)

## Install the OS

Ideally in the future, imaging the storage server will be automated just like it is for the router and cluster nodes. But because of the RAID setup, it's not as straightforward to use Clonezilla. Instead, we'll follow a standard Ubuntu installation process, configuring the RAID during install.

- [Download Ubuntu Server](https://ubuntu.com/download/server) - I choose LTS, 22.04.3
- Use [balenaEtcher](https://etcher.balena.io/) to burn the ISO to a USB drive
- Boot the NUC from the USB drive (hold F2 on boot to enter the BIOS config and set your boot order to prefer USB)
- Configure a standard installation
  - Connect wlan by editing Wifi settings
  - When prompted, update the installer to the latest verions
  - Customize the storage configuration.
    - Custom storage layout
    - Completely clear out both disks that will be used for RAID (but not the USB disk you used to boot the installer).
    - We'll be creating a set of partitions on the disk through several different means:
      - `/boot/efi` - for your fastest drive, select `Use as Boot Device`. For your other drive, select `Add As Another Boot Device`, which will add it as a backup EFI boot partition
      - `/dev/md0` - RAID1 physical volume. 
        - For both drives, select the `free space` → `Add GPT Partition`, leave the Size blank to use the max, under Format choose `Leave unformatted`, and Create.
        - Now choose `Create software RAID` and leave as `md0` RAID Level 1. Select partition 2 under both of your hard drives (not the USB), and Create.
      - For /boot, swap, and / (root)
        - `Create volume group (LVM)`, select `md0`, leave all options unchanged, and Create.
          - `swap` - Under the resulting `vg0` device, select the `free space` → `Create Logical Volume` , set the size to 32G (or twice your machine's RAM), select `swap` as the Format and Create.
          - `/boot` - Again, under the `vg0` device, select the `free space` → `Create Logical Volume` , set the size to 1G, select `ext4` as the Format, `/boot` as the Mount and Create.
          - `/` (root) - Again, under the `vg0` device, select the `free space` → `Create Logical Volume` , leave the size blank for the max, select `ext4` as the Format, `/` as the Mount and Create.
    - Done
  - I chose `data1` as the machine name and `pi` as my username. All the rest of the instructions and scripts here assume these names.
  - Install OpenSSH server
  - - It's pretty neat to just import your SSH identity. Since my public key is [added](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) to my Github, I just point the installer to my Github username and everything just works.
    - If you use the above import approach, then do NOT allow password authentication over SSH. There's no need, and it's less secure.
  - No need to install any of the Featured Server Snaps
  - After security updates apply, Reboot Now 🙌
    - Don't worry if it says `Failed unmounting /cdrom`. Eventually it'll tell you to remove the USB and hit ENTER.

After installation completes, you should be able to ssh in to the machine using its IP address (like `ssh pi@192.168.86.202`). If you want it to have a fixed IP address on your home network (remember this is just temporary anyway), ask the [Edge Lab Assistant](https://chat.openai.com/g/g-CCcHNwSF9-edge-lab-assistant) how to set up a fixed IP on the machine itself. Better yet you can do what I do and configure your home router to create a reserved IP address for this machine. 

After logging in or SSHing in, running `lsblk` should show the following:

```bash
NAME            MAJ:MIN RM   SIZE RO TYPE  MOUNTPOINTS
loop0             7:0    0  63.4M  1 loop  /snap/core20/1974
loop1             7:1    0 111.9M  1 loop  /snap/lxd/24322
loop2             7:2    0  53.3M  1 loop  /snap/snapd/19457
sda               8:0    0   1.8T  0 disk
├─sda1            8:1    0     1G  0 part
└─sda2            8:2    0   1.8T  0 part
  └─md0           9:0    0   1.8T  0 raid1
    ├─vg0-lv--0 253:0    0    32G  0 lvm   [SWAP]
    ├─vg0-lv--1 253:1    0     1G  0 lvm   /boot
    └─vg0-lv--2 253:2    0   1.8T  0 lvm   /
nvme0n1         259:0    0   1.8T  0 disk
├─nvme0n1p1     259:1    0     1G  0 part  /boot/efi
└─nvme0n1p2     259:2    0   1.8T  0 part
  └─md0           9:0    0   1.8T  0 raid1
    ├─vg0-lv--0 253:0    0    32G  0 lvm   [SWAP]
    ├─vg0-lv--1 253:1    0     1G  0 lvm   /boot
    └─vg0-lv--2 253:2    0   1.8T  0 lvm   /
```

## Initial Housekeeping

### Simple (zeroconf) DNS

Now we can setup Avahi for local mDNS/zeroconf name resolution, just like on the Pis.

```bash
sudo apt install avahi-daemon avahi-discover avahi-utils libnss-mdns mdns-scan
sudo systemctl status avahi-daemon
# if needed:
sudo systemctl start avahi-daemon
sudo systemctl enable avahi-daemon
```

Now you can reboot and SSH back in using the machine name

```bash
sudo reboot
```

```bash
ssh pi@data1 
```

### Run OS Updates

On data1, update all packages:

```
sudo apt update
sudo apt upgrade
```

Set the timezone of the machine. (Replace `America/New_York` with your timezone).

```bash
sudo timedatectl set-timezone America/New_York
```

### Update GRUB Boot Menu Timeout (Speedup Boot)

```bash
sudo sh -c 'echo GRUB_RECORDFAIL_TIMEOUT=5 >> /etc/default/grub';
sudo update-grub;
```

## Configure Networking

We'll create a simple hostname we can use (`data1`) with avahi zeroconf. 

###### Make Network Interfaces Optional (Speedup Boot)

On data1, make all network adapters optional so Ubuntu doesn't wait for them on boot. Edit files like `/etc/netplan/00-installer-config.yaml` (and others in the `etc/netplan` directory) to have `optional: true` defined for any interfaces that are optional. Like this:

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

```bash
network:
  ethernets:
    eno1:
      dhcp4: true
      optional: true
  version: 2
```

```bash
sudo nano /etc/netplan/00-installer-config-wifi.yaml
```

```bash
network:
  version: 2
  wifis:
    wlp0s20f3:
      access-points:
        <your SSID>:
          password: <your password>
      dhcp4: true
      optional: true
```

## Create a share folder for OS images

We'll consider this machine our "storage server" -- mostly used as a database server, but also providing some NFS shared directories which we'll need for being able to re-image the cluster nodes.

```
sudo apt install nfs-kernel-server
sudo mkdir -p /srv/os_images
sudo nano /etc/exports
# add this line:
/srv/os_images *(rw,sync,no_subtree_check)

sudo exportfs -a
sudo systemctl restart nfs-kernel-server
sudo chmod 777 /srv/os_images
```

## 

## OLD Configure Connection to Lab Network

On pi0, add a reserved IP for this server:

```
sudo nano /etc/dnsmasq.conf
# Add line for data1 db server
# data1
dhcp-host=1c:69:7a:a2:6f:89,192.168.87.2,data1

# restart dnsmasq
sudo systemctl restart dnsmasq
```

## Disable Wifi Connection

## Wake-on-LAN

It's nice to be able to put our whole cluster in a closet somewhere but still be able to power it off and on remotely. This NUC machine (data1) supports wake-on-LAN, which means we can power it on from a fully shutdown state over the network.

On pi0, which should have ethernet connectivity to data1:

```bash
sudo apt update
sudo apt install etherwake
cat /var/lib/misc/dnsmasq.leases
# Find the MAC address of data1
sudo etherwake 1c:69:7a:a2:6f:89
# Replace the above with you're data1 MAC address
```
