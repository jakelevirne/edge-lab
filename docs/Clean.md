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

## Boot order

All pi's have their bootloader set to boot from USB first and then backoff to SDCard. This allows us to mess around with pulling and inserting SDCards as often (we can just either attach or detach the USB before booting).

## Pi0

### Backup pi0

SSH in to the pi that's been booted with the imager media.

Ensure the data1/srv/os_images NFS is available:

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

Ensure the data1/srv/os_images NFS is available:

```
showmount -e 192.168.86.202
```

Run clonezilla to restore

```
sudo apt install clonezilla
sudo clonezilla
# work through it step-by-step or, instead run these commands, updating img name and volume as appropriate
sudo mkdir -p /home/partimag
sudo mount 192.168.86.202:/srv/os_images /home/partimag

#TODO: Review this command
/usr/sbin/ocs-sr -g auto -e1 auto -e2 -r -j2 -c -k0 -p choose restoredisk pi0-2024-01-31-img mmcblk0

# These steps are only needed if the SD card is bigger than 128GB
# But running them shouldn't hurt either way.
sudo apt install cloud-utils
sudo growpart /dev/mmcblk0 2
sudo resize2fs /dev/mmcblk0
sudo reboot
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

Additional tools:

```bash
sudo apt install tmux
```

## Pi1..N

### Backup pi1..N

SSH in to the pi that's been booted with the imager media.

Ensure the data1/srv/os_images NFS is available:

```
showmount -e 192.168.87.2
```

Run clonezilla to backup

```
sudo apt install clonezilla
sudo clonezilla
# work through it step-by-step or, run this single command, updating img name and volume as appropriate
sudo mkdir -p /home/partimag
sudo mount 192.168.87.2:/srv/os_images /home/partimag

sudo /usr/sbin/ocs-sr -q2 -c -j2 -z1p -i 0 -sfsck -senc -p choose savedisk pi1-2024-01-31-img mmcblk0
```

### Restore pi1..N

Force the pi to boot from the imager media by formatting the boot partition of the USB drive:

```bash
sudo umount /dev/sda1
sudo mkfs.vfat /dev/sda1
```

SSH in to the pi that's been booted with the imager media (e.g. `ssh imager1)`.

Ensure the data1/srv/os_images NFS is available:

```
showmount -e data1
```

Run clonezilla to restore

```
sudo apt install clonezilla
#sudo clonezilla
# work through it step-by-step or, instead run these commands, updating img name and volume as appropriate
sudo mkdir -p /home/partimag
sudo mount data1:/srv/os_images /home/partimag

sudo /usr/sbin/ocs-sr -g auto -e1 auto -e2 -r -j2 -c -k0 -p noreboot -batch restoredisk pi1-2024-01-31-img sda
# sudo /usr/sbin/ocs-sr -g auto -e1 auto -e2 -r -j2 -c -k0 -p choose restoredisk pi1-2024-01-31-img sda
```

```bash
*****************************************************.
The following step is to restore an image to the hard disk/partition(s) on this machine: "/tmp/pi1-2024-01-31-img-tmp-cnvted" -> "sda sda1 sda2"
The image was created at: 2024-0131-1432
WARNING!!! WARNING!!! WARNING!!!
Are you sure you want to continue? (y/n)
```

Expand the root partition (/) to the full size of the disk:

```
sudo apt install cloud-utils
sudo growpart /dev/sda 2
sudo resize2fs /dev/sda2
# update the hostname before rebooting
sudo mkdir -p /mnt/dev/sda2
sudo mount /dev/sda2 /mnt/dev/sda2
echo "piX" | sudo tee /mnt/dev/sda2/etc/hostname
sudo sed -i 's/pi1/piX/g' /mnt/dev/sda2/etc/hosts
```

Reboot, then SSH into the re-imaged machine and make sure the hostname is set correctly:

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

SSH into pi0 and make sure this machine has a reserved IP

```
# In general, I prefer using reserved IPs from a DHCP server rather than static IP addresses configured separately on each machine.
cat /var/lib/misc/dnsmasq.leases
sudo nano /etc/dnsmasq.conf
# Add lines that look like:
# pi1
dhcp-host=d8:3a:dd:f7:78:e0,192.168.87.101,pi1
# restart dnsmasq
sudo systemctl restart dnsmasq
# apply all configurations
sudo systemctl restart NetworkManager
```

Additional tools:

```bash
sudo apt install tmux
```
