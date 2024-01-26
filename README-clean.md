To rest pi0 to a completely clean state:

- Turn off pi0
- Plug in the imager USB drive
- Ensure an SD card is in the slot with the right two partitions (both will get wiped in this process)
- Boot from the imager USB drive
- run cleanSD.sh
```
sudo umount /dev/mmcblk0p1
sudo umount /dev/mmcblk0p2
sudo mkfs.vfat -F 32 /dev/mmcblk0p1
sudo mkfs.ext4 /dev/mmcblk0p2
sudo mkdir -p ~/mnt/mmcblk0p1
sudo mkdir -p ~/mnt/mmcblk0p2
sudo mount /dev/mmcblk0p1 ~/mnt/mmcblk0p1
sudo mount /dev/mmcblk0p2 ~/mnt/mmcblk0p2
sudo rsync -avhP --checksum ~/images/raspios/2023-12-11-raspios-bookworm-arm64-lite/vfat/ /mnt/mmcblk0p1/ > restore_output_vfat.txt 2>&1
sudo rsync -avhP --checksum ~/images/raspios/2023-12-11-raspios-bookworm-arm64-lite/ext4/ /mnt/mmcblk0p2/ > restore_output_ext4.txt 2>&1
#Copy the special config files too
sudo cp ~/configs/pi0/* ~/mnt/mmcblk0p1
echo "Shut down, unplug the usb, then power on"
exit 0
```


To create the image backups initially:
```
sudo mkdir -p ~/mnt/mmcblk0p1
sudo mkdir -p ~/mnt/mmcblk0p2
sudo mount /dev/mmcblk0p1 ~/mnt/mmcblk0p1
sudo mount /dev/mmcblk0p2 ~/mnt/mmcblk0p2
sudo mkdir -p ~/images/raspios/2023-12-11-raspios-bookworm-arm64-lite/vfat
sudo mkdir -p ~/images/raspios/2023-12-11-raspios-bookworm-arm64-lite/ext4
sudo rsync -avhP --checksum --no-perms --no-owner --no-group ~/mnt/mmcblk0p1/ ~/images/raspios/2023-12-11-raspios-bookworm-arm64-lite/vfat/ > rsync_output.txt 2>&1
sudo rsync -avhP --checksum ~/mnt/mmcblk0p2/ ~/images/raspios/2023-12-11-raspios-bookworm-arm64-lite/ext4/ > rsync_output2.txt 2>&1
sudo umount ~/mnt/mmcblk0p1
sudo umount ~/mnt/mmcblk0p2

```
