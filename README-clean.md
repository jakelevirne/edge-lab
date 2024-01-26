To reset pi0 to a completely clean state:

- Turn off pi0
- Plug in the imager USB drive
- Ensure an SD card is in the slot with the right two partitions (both will get wiped in this process)
- Boot from the imager USB drive
- run cleanSD.sh
```
# sudo umount /dev/mmcblk0p1
# sudo umount /dev/mmcblk0p2
# sudo mkfs.vfat -F 32 /dev/mmcblk0p1
# sudo mkfs.ext4 /dev/mmcblk0p2
sudo mkdir -p ~/mnt/mmcblk0p1
sudo mkdir -p ~/mnt/mmcblk0p2
sudo mount /dev/mmcblk0p1 ~/mnt/mmcblk0p1
sudo mount /dev/mmcblk0p2 ~/mnt/mmcblk0p2
# try deleting instead
sudo rm -rf ~/mnt/mmcblk0p1/*
sudo rm -rf ~/mnt/mmcblk0p2/*

sudo rsync -avhP --checksum ~/images/raspios/2023-12-11-raspios-bookworm-arm64-lite/vfat/ ~/mnt/mmcblk0p1/ > restore_output_vfat.txt 2>&1
sudo rsync -avhP --checksum ~/images/raspios/2023-12-11-raspios-bookworm-arm64-lite/ext4/ ~/mnt/mmcblk0p2/ > restore_output_ext4.txt 2>&1
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

## Disk benchmarking
```
sudo fio --filename=/dev/mmcblk0 --direct=1 --rw=randrw --bs=4k --ioengine=libaio --iodepth=256 --runtime=120 --numjobs=4 --time_based --group_reporting --name=iops-test-job --eta-newline=1
sudo fio --filename=/dev/sda --direct=1 --rw=randrw --bs=4k --ioengine=libaio --iodepth=256 --runtime=120 --numjobs=4 --time_based --group_reporting --name=iops-test-job --eta-newline=1
```

### SD Card performance
```
iops-test-job: (groupid=0, jobs=4): err= 0: pid=1711: Fri Jan 26 11:56:34 2024
  read: IOPS=855, BW=3424KiB/s (3506kB/s)(402MiB/120117msec)
    slat (usec): min=2, max=74678, avg=248.19, stdev=2305.18
    clat (msec): min=113, max=886, avg=558.90, stdev=77.46
     lat (msec): min=113, max=886, avg=559.15, stdev=77.46
    clat percentiles (msec):
     |  1.00th=[  409],  5.00th=[  451], 10.00th=[  468], 20.00th=[  493],
     | 30.00th=[  518], 40.00th=[  535], 50.00th=[  550], 60.00th=[  575],
     | 70.00th=[  600], 80.00th=[  617], 90.00th=[  667], 95.00th=[  693],
     | 99.00th=[  760], 99.50th=[  785], 99.90th=[  827], 99.95th=[  835],
     | 99.99th=[  869]
   bw (  KiB/s): min= 1544, max= 4704, per=99.83%, avg=3418.15, stdev=125.19, samples=958
   iops        : min=  386, max= 1176, avg=854.54, stdev=31.30, samples=958
  write: IOPS=858, BW=3436KiB/s (3518kB/s)(403MiB/120117msec); 0 zone resets
    slat (usec): min=3, max=85234, avg=4399.20, stdev=10475.29
    clat (msec): min=106, max=1523, avg=628.19, stdev=99.53
     lat (msec): min=113, max=1523, avg=632.59, stdev=100.20
    clat percentiles (msec):
     |  1.00th=[  447],  5.00th=[  485], 10.00th=[  518], 20.00th=[  550],
     | 30.00th=[  575], 40.00th=[  600], 50.00th=[  617], 60.00th=[  642],
     | 70.00th=[  676], 80.00th=[  701], 90.00th=[  751], 95.00th=[  793],
     | 99.00th=[  911], 99.50th=[  995], 99.90th=[ 1217], 99.95th=[ 1284],
     | 99.99th=[ 1385]
   bw (  KiB/s): min= 1464, max= 4824, per=99.80%, avg=3429.17, stdev=129.48, samples=958
   iops        : min=  366, max= 1206, avg=857.29, stdev=32.37, samples=958
  lat (msec)   : 250=0.12%, 500=14.99%, 750=78.94%, 1000=5.71%, 2000=0.23%
  cpu          : usr=0.11%, sys=0.36%, ctx=149228, majf=0, minf=36
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.1%, 32=0.1%, >=64=99.9%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.1%
     issued rwts: total=102812,103180,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=256

Run status group 0 (all jobs):
   READ: bw=3424KiB/s (3506kB/s), 3424KiB/s-3424KiB/s (3506kB/s-3506kB/s), io=402MiB (421MB), run=120117-120117msec
  WRITE: bw=3436KiB/s (3518kB/s), 3436KiB/s-3436KiB/s (3518kB/s-3518kB/s), io=403MiB (423MB), run=120117-120117msec

Disk stats (read/write):
  mmcblk0: ios=102816/102974, merge=0/0, ticks=3435327/10395975, in_queue=13831357, util=100.00%
```

### USB SSD Performance

```
iops-test-job: (groupid=0, jobs=4): err= 0: pid=1413: Fri Jan 26 12:07:29 2024
  read: IOPS=9560, BW=37.3MiB/s (39.2MB/s)(4482MiB/120006msec)
    slat (usec): min=2, max=142014, avg=128.13, stdev=492.53
    clat (msec): min=3, max=551, avg=53.23, stdev=16.65
     lat (msec): min=3, max=551, avg=53.36, stdev=16.70
    clat percentiles (msec):
     |  1.00th=[   39],  5.00th=[   43], 10.00th=[   45], 20.00th=[   47],
     | 30.00th=[   49], 40.00th=[   51], 50.00th=[   52], 60.00th=[   54],
     | 70.00th=[   56], 80.00th=[   58], 90.00th=[   63], 95.00th=[   68],
     | 99.00th=[   78], 99.50th=[   82], 99.90th=[  380], 99.95th=[  414],
     | 99.99th=[  472]
   bw (  KiB/s): min= 2505, max=45232, per=100.00%, avg=38240.17, stdev=1326.48, samples=956
   iops        : min=  626, max=11308, avg=9560.04, stdev=331.62, samples=956
  write: IOPS=9570, BW=37.4MiB/s (39.2MB/s)(4486MiB/120006msec); 0 zone resets
    slat (usec): min=2, max=145534, avg=282.97, stdev=710.28
    clat (msec): min=2, max=539, avg=53.21, stdev=16.71
     lat (msec): min=3, max=540, avg=53.49, stdev=16.79
    clat percentiles (msec):
     |  1.00th=[   39],  5.00th=[   43], 10.00th=[   44], 20.00th=[   47],
     | 30.00th=[   48], 40.00th=[   51], 50.00th=[   52], 60.00th=[   54],
     | 70.00th=[   56], 80.00th=[   58], 90.00th=[   63], 95.00th=[   68],
     | 99.00th=[   78], 99.50th=[   82], 99.90th=[  376], 99.95th=[  405],
     | 99.99th=[  447]
   bw (  KiB/s): min= 2858, max=44864, per=100.00%, avg=38283.32, stdev=1306.38, samples=956
   iops        : min=  714, max=11216, avg=9570.83, stdev=326.60, samples=956
  lat (msec)   : 4=0.01%, 10=0.01%, 20=0.01%, 50=40.92%, 100=58.76%
  lat (msec)   : 250=0.11%, 500=0.18%, 750=0.01%
  cpu          : usr=1.19%, sys=4.52%, ctx=1430277, majf=0, minf=38
  IO depths    : 1=0.1%, 2=0.1%, 4=0.1%, 8=0.1%, 16=0.1%, 32=0.1%, >=64=100.0%
     submit    : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.0%
     complete  : 0=0.0%, 4=100.0%, 8=0.0%, 16=0.0%, 32=0.0%, 64=0.0%, >=64=0.1%
     issued rwts: total=1147279,1148535,0,0 short=0,0,0,0 dropped=0,0,0,0
     latency   : target=0, window=0, percentile=100.00%, depth=256

Run status group 0 (all jobs):
   READ: bw=37.3MiB/s (39.2MB/s), 37.3MiB/s-37.3MiB/s (39.2MB/s-39.2MB/s), io=4482MiB (4699MB), run=120006-120006msec
  WRITE: bw=37.4MiB/s (39.2MB/s), 37.4MiB/s-37.4MiB/s (39.2MB/s-39.2MB/s), io=4486MiB (4704MB), run=120006-120006msec

Disk stats (read/write):
  sda: ios=1145655/1146849, merge=0/0, ticks=3412119/3411136, in_queue=6823505, util=100.00%

```
