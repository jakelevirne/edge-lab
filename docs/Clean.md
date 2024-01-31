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


## Backup pi
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
