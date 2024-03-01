# Download Source

```bash
wget http://download.silicondust.com/hdhomerun/libhdhomerun_20210624.tgz
tar zxvf libhdhomerun_20210624.tgz 
```

# Install Tools

```bash
sudo apt-get install make gcc autoconf automake
```

# Building Tools

```bash
make
sudo make install
```

Run all commands below with `./hdhomerun_config`. For example `./hdhomerun_config discover`

# Discovery

```text
./hdhomerun_config discover

#output
hdhomerun device 103A9917 found at 192.168.1.116
```

# Scanning Channels

```text
hdhomerun_config 103A9917 scan /tuner0 scan0.log

#output
SCANNING: 587000000 (us-bcast:33)
LOCK: 8vsb (ss=100 snq=79 seq=100)
TSID: 0x01FB
PROGRAM 3: 3.1 WFSB
PROGRAM 5: 3.3 WFSB-3
PROGRAM 6: 3.4 WFSB-4
SCANNING: 581000000 (us-bcast:32)
LOCK: none (ss=54 snq=0 seq=0)
```

# Tuning Channels

```text
hdhomerun_config 103A9917 set /tuner0/channel auto:33
hdhomerun_config 103A9917 set /tuner0/channel 8vsb: 587000000
```

# Detect Sub-Programs

```text
hdhomerun_config 103A9917 get /tuner0/streaminfo

#output
3: 3.1 WFSB
5: 3.3 WFSB-3
6: 3.4 WFSB-4
tsid=0x01FB
```

# Select Sub-Program

```
hdhomerun_config 103A9917 set /tuner0/program 1
```

# Saving Content to Local File

```text
hdhomerun_config 103A9917 save /tuner0 capture.mpg
```

# Saving Content to system out

```text
hdhomerun_config 103A9917 save /tuner0 - 
```

# Saving Content to Remote UDP Listener

```text
hdhomerun_config 103A9917 set /tuner0/target udp://192.168.1.100:5000
```



## This is the magic command that actually works

```bash
./hdhomerun_config 10918CAB save /tuner0 - | ccextractor -stdin -quiet -stdout
```

[Working with HDHomeRun | CCExtractor](https://ccextractor.org/public/general/working_with_hdhomerun/)

[CCExtractor](https://ccextractor.org/public/gsoc/repository_clients/)

https://www.silicondust.com/hdhomerun/hdhomerun_development.pdf

https://github.com/CCExtractor/ccextractor/blob/master/docs/raspberrypi.md



```bash
./hdhomerun_config 10918CAB scan /tuner0
./hdhomerun_config 10918CAB set /tuner0/channel auto:593000000
./hdhomerun_config 10918CAB get /tuner0/streaminfo
./hdhomerun_config 10918CAB set /tuner0/program 3

```
