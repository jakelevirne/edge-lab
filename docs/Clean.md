# How to Clean and Re-image Machines

## Imager Boot Disk
Use the Raspberry Pi imager to create a machine called "imager" (so meta)
- Device: Raspberry Pi 5, OS: Raspberry Pi OS Lite (64-bit)
- Edit Settings
  - Set hostname to imager
  - Uncheck username and password
  - Configure wireless lan
  - Set locale settings
  - Under Services, enable SSH, allow public-key auth only, and paste in public key
 
Boot pi with this new media and SSH in


## Pi0
pi0 is unique in that it is meant to normally run from an SDCard. Given this, the boot order has been changed to start from USB first, if available. Though this may seem counter-intuitive, it means that a backup/restore operating system (imager) can be loaded just by plugging in a USB that's been setup as above.

### Backup pi0

SSH in to the pi that's been booted with the imager media.

Ensure the nuc/srv/os_images NFS is available:
```
showmount -e 192.168.86.202
```

Run clonezilla to backup
```
sudo apt install clonezilla
sudo clonezilla
# work through it step-by-step or, run this single command, updating img name and volume as appropriate
# Not clear how this works, though... need to somehow specify or mount the NFS source directory (/srv/os_images)
/usr/sbin/ocs-sr -q2 -c -j2 -z1p -i 0 -sfsck -senc -p choose savedisk pi0-2024-01-31-img mmcblk0
```

### Restore pi0
SSH in to the pi that's been booted with the imager media.

Ensure the nuc/srv/os_images NFS is available:
```
showmount -e 192.168.86.202
```

Run clonezilla to restore
```
sudo apt install clonezilla
sudo clonezilla
# work through it step-by-step or, run this single command, updating img name and volume as appropriate
# Not clear how this works, though... need to somehow specify or mount the NFS source directory (/srv/os_images)
/usr/sbin/ocs-sr -g auto -e1 auto -e2 -r -j2 -c -k0 -p choose restoredisk pi0-2024-01-31-img mmcblk0
```
SSH into the re-imaged machine and make sure the hostname is set correctly:
```
# check the current hostname
hostnamectl
# if needed, change it permanently
sudo nano /etc/hostname
sudo nano /etc/hosts
# Find the line with the old hostname and replace it with the new hostname.
# Usually, this is associated with the 127.0.1.1 IP
# Apply the changes:
sudo systemctl restart systemd-hostnamed
# Check the hostname again
hostnamectl
# Reboot for good measure
sudo reboot
```
Expand the root partition (/) to the full size of the disk:
```
sudo parted -l
sudo parted /dev/sda
# (parted) resizepart 2
# Set the end point to 100%
# quit
sudo resize2fs /dev/sda2
```


## Pi1..N
pi1..N normally run from an USB drives. Given this, the boot order has been left to start from SDCard first, if available. Though this may seem counter-intuitive, it means that a backup/restore operating system (imager) can be loaded just by inserting an SDCard that's been setup as above.

### Backup pi1..N

SSH in to the pi that's been booted with the imager media.

Ensure the nuc/srv/os_images NFS is available:
```
showmount -e 192.168.86.202
```

Run clonezilla to backup
```
sudo apt install clonezilla
sudo clonezilla
# work through it step-by-step or, run this single command, updating img name and volume as appropriate
# Not clear how this works, though... need to somehow specify or mount the NFS source directory (/srv/os_images)
/usr/sbin/ocs-sr -q2 -c -j2 -z1p -i 0 -sfsck -senc -p choose savedisk pi0-2024-01-31-img mmcblk0
```

### Restore pi1..N
SSH in to the pi that's been booted with the imager media.

Ensure the nuc/srv/os_images NFS is available:
```
showmount -e 192.168.86.202
```

Run clonezilla to restore
```
sudo apt install clonezilla
sudo clonezilla
# work through it step-by-step or, run this single command, updating img name and volume as appropriate
# Not clear how this works, though... need to somehow specify or mount the NFS source directory (/srv/os_images)
/usr/sbin/ocs-sr -g auto -e1 auto -e2 -r -j2 -c -k0 -p choose restoredisk pi0-2024-01-31-img mmcblk0
sudo shutdown -h now
```

SSH into the re-imaged machine and make sure the hostname is set correctly:
```
# check the current hostname
hostnamectl
# if needed, change it permanently
sudo nano /etc/hostname
sudo nano /etc/hosts
# Find the line with the old hostname and replace it with the new hostname.
# Usually, this is associated with the 127.0.1.1 IP
# Apply the changes:
sudo systemctl restart systemd-hostnamed
# Check the hostname again
hostnamectl
# Reboot for good measure
sudo reboot
```
Expand the root partition (/) to the full size of the disk:
```
sudo parted -l
sudo parted /dev/sda
# (parted) resizepart 2
# Set the end point to 100%
# quit
sudo resize2fs /dev/sda2
```

