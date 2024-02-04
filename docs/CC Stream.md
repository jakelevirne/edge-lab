# Download Source

```text
#> wget http://download.silicondust.com/hdhomerun/libhdhomerun_20210624.tgz
#> tar zxvf libhdhomerun_20210624.tgz 
```

# Install Tools

```text
#> sudo apt-get install make gcc autoconf automake
```

# Building Tools

```text
#> make
#> sudo make install
```

# Discovery

```text
#> discover
hdhomerun device 103A9917 found at 192.168.1.116
```

# Scanning Channels

```text
#> hdhomerun_config 103A9917 scan /tuner0 scan0.log
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
#> hdhomerun_config 103A9917 set /tuner0/channel auto:33
#> hdhomerun_config 103A9917 set /tuner0/channel 8vsb: 587000000
```

# Detect Sub-Programs

```text
#> hdhomerun_config 103A9917 get /tuner0/streaminfo
3: 3.1 WFSB
5: 3.3 WFSB-3
6: 3.4 WFSB-4
tsid=0x01FB
```

# Select Sub-Program

```
#> hdhomerun_config 103A9917 set /tuner0/program 1
```

# Saving Content to Local File

```text
#> hdhomerun_config 103A9917 save /tuner0 capture.mpg
```

# Saving Content to system out

```text
#> hdhomerun_config 103A9917 save /tuner0 - 
```

# Saving Content to Remote UDP Listener

```text
#> hdhomerun_config 103A9917 set /tuner0/target udp://192.168.1.100:5000
```

hdhomerun_config 10918CAB save /tuner0  | ccextractor -stdin
