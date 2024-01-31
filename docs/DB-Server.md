# Database Server
This will be a database server, running on an Intel NUC. It currently consists of two 2TB hard drives (one SATA SSD and one m.2 NVME) configured as software RAID1.

## Install the OS
- [Download Ubuntu Server](https://ubuntu.com/download/server) - I choose LTS, 22.04.3
- Use balena Etcher to burn the ISO to a USB drive
- Boot the NUC from the USB drive (F2 bios)
- Configure a standard installation, except for the disks.
  - Completely clear out both disks that will be used for RAID.
  - We'll be creating 4 identical partitions on each disk (two of which will be included in the software RAID array)
    - /boot/efi - This gets created when you tag a disk as Bootable. Make each drive Bootable, and the installer will automatically create these partitions (one as the default and one as the backup). These don't get included in the RAID array.
    - [SWAP] - Create an identical SWAP partition on each drive. These will not be included in the RAID array.
    - /boot - Create identically sized partitions on each drive (1G should be more than enough space). For now, choose Leave Unformatted. These will get identified as the /boot partition when the software RAID is created.
    - / (root) - Create identically sized partitions on each drive using the remaining space. For now, choose Leave Unformatted. These will get identified as the / (root) partition when the software RAID is created.
    - Create a software RAID1 partition consisting of the two 1G partitions created above. Make it ext4 and choose /boot as the mount point.
    - Create a software RAID1 partition consisting of the two big partitions created above. Make it ext4 and choose / as the mount point.
    - We could create an LVM on top of these, but it felt overly complicated so I didn't.

After installation completes, running `lsblk` should show the following:
```
NAME        MAJ:MIN RM   SIZE RO TYPE  MOUNTPOINTS
loop0         7:0    0  63.4M  1 loop  /snap/core20/1974
loop1         7:1    0 111.9M  1 loop  /snap/lxd/24322
loop2         7:2    0  53.3M  1 loop  /snap/snapd/19457
sda           8:0    0   1.8T  0 disk  
├─sda1        8:1    0     1G  0 part  /boot/efi
├─sda2        8:2    0    32G  0 part  [SWAP]
├─sda3        8:3    0     1G  0 part  
│ └─md0       9:0    0  1022M  0 raid1 
│   └─md0p1 259:5    0  1020M  0 part  /boot
└─sda4        8:4    0   1.8T  0 part  
  └─md1       9:1    0   1.8T  0 raid1 
    └─md1p1 259:6    0   1.8T  0 part  /
nvme0n1     259:0    0   1.8T  0 disk  
├─nvme0n1p1 259:1    0     1G  0 part  
├─nvme0n1p2 259:2    0    32G  0 part  [SWAP]
├─nvme0n1p3 259:3    0     1G  0 part  
│ └─md0       9:0    0  1022M  0 raid1 
│   └─md0p1 259:5    0  1020M  0 part  /boot
└─nvme0n1p4 259:4    0   1.8T  0 part  
  └─md1       9:1    0   1.8T  0 raid1 
    └─md1p1 259:6    0   1.8T  0 part  /
``` 

## Configure Networking
On pi0, add a reserved IP for this server:
```
sudo nano /etc/dnsmasq.conf
# Add line for nuc db server
# nuc
dhcp-host=1c:69:7a:a2:6f:89,192.168.87.2,nuc
```

## Create a share folder for OS images
We'll consider this machine our "storage server" -- mostly used as a database server, but also 
