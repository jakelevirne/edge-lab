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

## 

## Prepare Cluster

One of the goals for this cluster is to be able to wipe it clean to quickly get it back to its initial state without having to physically touch the machines. This allows us to play and experiment more easily. We'll use an approach of enabling each of the Pis to dual-boot, either into the USB drive for normal operations or into the SD card when we need to re-image the machines. This setup requires several one-time steps.

### Set all Pis to USB Boot Mode preference

While there are several ways to change the [boot order](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#BOOT_ORDER) of the Pis, the most consistent approach I've found is to use [Raspberry Pi Imager](https://github.com/raspberrypi/rpi-imager) to create an SD card with the USB Boot bootloader EEPROM config. 

Start the imager, select your device (Raspberry Pi 5), for Operating System choose `Misc utility images` → `Bootloader` → `USB Boot`. Choose Storage and select your SD card.

With everything else disconnected, put this SD card into each Pi one by one, powering each one up in turn. Look for the green blinking light on the Pi to indicate that the bootloader flashed appropriately. (If you happen to have a monitor connected, you'll see the monitor show green).

This will set each Pi to prefer the USB device for booting. But the Pis will still boot from an SD card if the USB device is not present or is unbootable. We'll use this fact in the future to allow us to change the boot disk when needed.

### Create `imager` SD cards

We'll leave SD cards in each of the Pis that can be used whenever needed to re-image the attached USB drives. During normal operation, these SD cards won't be used. But whenever a Pi has no bootable USB drive attached, the `imager` SD card will kick in as the boot device.

For each device, pi0 ... pi3, use the Raspberry Pi Imager on your laptop to create these SD cards. 

Start the imager, select your device (Raspberry Pi 5), for Operating System choose `Raspberry Pi OS (other)` → `Raspberry Pi OS Lite (64-bit)`. Choose Storage and select your SD card. Hit Next.

Customize the OS by choosing `Edit Settings` and then select the following options:

- ☑ Set hostname: `imager0`
  
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

SSH key setup is a complex topic in and of itself. If you don't already have and use SSH keys, then this [tutorial](https://www.digitalocean.com/community/tutorials/how-to-create-ssh-keys-with-openssh-on-macos-or-linux) walks through the process of creating new ones. If you change any of the defaults during key generation (e.g. a different key filename or non-blank passphrase), you should edit or create your `~/.ssh/config` file to match. For example, mine looks like this because I have a custom identity filename, and I used a passphrase, and I'm on a Mac which let's me use the Keychain to store the passphrase:

```bash
Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_default
```

For more help, ask the [Edge Lab Assistant](https://chat.openai.com/g/g-CCcHNwSF9-edge-lab-assistant) in ChatGPT. 

You can insert these SD cards into your Pis and power all of them on. Make sure no USB drives or sticks are inserted otherwise the Pis will attempt to boot from them instead of the SD cards. Once booted, you should be able to SSH into any of these using something like `ssh pi@imager0`.

### Setup an NFS device

You'll need a location for storing your clean disk images. One option would be another USB drive that you plug in and out of each of the machines when imaging. But that defeats our goal of fully remote cluster management. Instead we'll setup an NFS share. In my lab, an Intel NUC acts as an NFS server and a database server. Follow the instructions for setting up the [Storage Server](<Storage Server.md>).

Alternatively, you could setup an NFS share from your laptop. For more help, ask the [Edge Lab Assistant](https://chat.openai.com/g/g-CCcHNwSF9-edge-lab-assistant).

### 

### Create a Clean Image

The general approach we take here for resetting the cluster is cloning and restoring a clean disk image using Clonezilla. The reason for this choice is that Clonezilla is nicely scriptable from the command line while other tools, like the [Raspberry Pi Imager](https://github.com/raspberrypi/rpi-imager) or [balenaEtcher](https://etcher.balena.io/) are not. An alternative approach would be to work with [Raspberry Pi OS images](https://www.raspberrypi.com/software/operating-systems/) directly, hand-coding cmdline.txt and firstrun.sh, and using a tool like `dd`. But that feels like a brittle re-implementation of Raspberry Pi Imager. Instead we'll use the Pi Imager to create a nearly fully configured USB disk and then back that up as our clean starting point for lab machines.

On your laptop, use Raspberry Pi Imager, exactly as above with these changes:

- Insert a USB stick instead of an SD card into your laptop

- Set the hostname to `changeme`

Do NOT boot this USB stick. It'll serve as the source for our Clonezilla clean image. Instead, boot up `imager0` using its SD card, and only after bootup has completed, insert this USB stick into `imager0`. Now we can use Clonezilla to backup the `changeme` Raspberry Pi OS image to NFS.

#### Backup the Clean Image to `data1`

SSH into `imager0` and ensure the clean USB is readable

```bash
lsblk
```

In order to access `data1` as our NFS server, we need to be able to connect to it. If you've left it's wifi enabled, you could connect from `imager0` to `data1` via your home network (using either IP address or host name). These instructions will instead assume that `data1`'s wifi is disabled and we'll establish a connection to it over the lab network. At this point, all machines' ethernet ports should be connected to your lab network switch.

Establish a fixed IP on the lab subnet for `imager0`'s ethernet interface:

```bash
nmcli con show
sudo nmcli con mod "Wired connection 1" ipv4.addresses 192.168.87.1/24 ipv4.method manual
sudo nmcli con down "Wired connection 1" && sudo nmcli con up "Wired connection 1"
ping 192.168.87.2
```

Mount the shared `os_images` directory from `data1`

```bash
showmount -e 192.168.87.2
sudo mkdir -p /home/partimag
sudo mount 192.168.87.2:/srv/os_images /home/partimag
```

Install and run Clonezilla Backup

```bash
sudo apt install clonezilla
# you could run clonezilla interactively (sudo clonezilla)
# or use this command to create a backup of sda (ensure this matches your USB)
sudo /usr/sbin/ocs-sr -q2 -c -j2 -z1p -i 0 -sfsck -senc -p noreboot savedisk pi-img sda
```

Now you should have a backup image of your clean Raspberry Pi OS image that's never been booted, with all your customizations (e.g. hostname `changeme` and wifi settings) in place. We'll use this later for pi1..pi3. For now, let's setup pi0 as a router to bridge our Home and Lab networks. DO NOT REBOOT YET. We have some configuration changes to make to the USB before first run.

Since the backed up image is the exact same one we have on this USB, we can skip this next step. But in the future, if you do ever need to reimage `pi0` by restoring this image to USB, you can use these commands:

```bash
sudo mkdir -p /home/partimag && sudo mount data1:/srv/os_images /home/partimag
sudo /usr/sbin/ocs-sr -g auto -e1 auto -e2 -r -j2 -c -k0 -p noreboot -batch restoredisk pi-img sda
```

There's also an [Ansible](Ansible.md) script in this repository for reimaging `pi0` that automates the above approach.

## Setup the Cluster

### Setup pi0 as our Lab Router

Make sure `pi0` ethernet is connected to your lab switch and the switch is powered on. Now's a good time to connect all of your Pis to the switch.

SSH in to `imager0` if you're not already and ensure the USB stick is still inserted. Now modify the configuration so that the hostname is properly set to `pi0` at initial boot.

```bash
sudo mkdir -p /mnt/sda1
sudo mount /dev/sda1 /mnt/sda1 
sudo nano /mnt/sda1/firstrun.sh
# Find and replace (Ctrl-\) all instances of changeme with pi0
sudo umount /dev/sda1
```

Now, we can reboot and this machine should ignore the SD card and instead boot into the clean USB image. Just before this boot is also a good time to give `pi0` a reserved IP address on your home network. You can find your `pi0` MAC address by running `ifconfig` and looking for the hex string just after the word `ether` under your wireless (`wlan0`) device. Most home routers have a page to set DHCP IP reservations by MAC address.

```bash
sudo reboot
```

If all went well, this machine should now be running with the hostname `pi0` and be ready for us to SSH in. 

You can continue from here, following these instructions manually. Or, better yet, now's a good time to get [Ansible](Ansile.md) setup on your laptop so you can automate this configuration.

```
sudo apt update
sudo apt upgrade

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
sudo nano /etc/dnsmasq.conf
# Add the following lines to the end of /etc/dnsmasq.conf
interface=eth0
dhcp-range=192.168.87.11,192.168.87.99,255.255.255.0,24h

# Reserved IPs
# In general, I prefer using reserved IPs from a DHCP server rather than static IP addresses configured separately on each machine.
sudo nano /etc/dnsmasq.conf
# You'll need the MAC address of each Pi's ethernet interface.
# Add lines that look like these. 
# pi1
dhcp-host=d8:3a:dd:f7:78:e0,192.168.87.101,pi1
# pi2
dhcp-host=d8:3a:dd:f7:77:d8,192.168.87.102,pi2
# pi3
dhcp-host=d8:3a:dd:e9:d4:3e,192.168.87.103,pi3
# data1
dhcp-host=1c:69:7a:a2:6f:89,192.168.87.2,data1

# restart dnsmasq
sudo systemctl restart dnsmasq
# apply all configurations
sudo systemctl restart NetworkManager
```

## Setup pi1 .. piN as cluster servers

Connect all of these pis to the same switch as pi0 and and ensure they're powered and booted using their SD cards (`imager1`..`imager3`). Once booted to their SD cards, attach a USB drive to each of them.

These steps can be performed automatically using the provided [Ansible](Ansible.md) scripts. 

SSH into `imager1` and get it up to date

```bash
sudo apt update
sudo apt upgrade
```

Now ensure the USB is recognized (it should be `sda`). This will be the target for restoring our clean image.

```bash
lsblk
```

Mount the shared `os_images` directory from `data1`

```bash
showmount -e data1.local
sudo mkdir -p /home/partimag
sudo mount data1.local:/srv/os_images /home/partimag
```

Install and run Clonezilla Restore:

```bash
sudo apt install clonezilla
# you could run clonezilla interactively (sudo clonezilla)
# or use this command to create a backup of sda (ensure this matches your USB)
sudo /usr/sbin/ocs-sr -g auto -e1 auto -e2 -r -j2 -c -k0 -p noreboot -batch restoredisk pi-img sda
```

Now modify the configuration so that the hostname is properly set to `pi1` at initial boot.

```bash
sudo mkdir -p /mnt/sda1
sudo mount /dev/sda1 /mnt/sda1 
sudo nano /mnt/sda1/firstrun.sh
# Find and replace (Ctrl-\) all instances of changeme with pi1
```

## DISABLE WIFI

Disable Wifi

```
sudo nano /mnt/sda1/config.txt
# paste the following line
dtoverlay=disable-wifi
```

Unmount sda1

```bash
sudo umount /dev/sda1
```

Now, we can reboot and this machine should ignore the SD card and instead boot into the clean USB image.

```bash
sudo reboot
```

If all went well, this machine should now be running with the hostname `pi1` and be ready for us to SSH in. Because it's no longer on the Home network (Wifi is disabled) we need to SSH into it via `pi0`.

```
# from laptop, proxyjump through pi0 to pi1
ssh -J pi@pi0.local pi@pi1.local
```

Test as follows:

```
# ping router (pi0) from pi1
ping 192.168.87.1
# ping external site from pi1
ping www.cnn.com
```

```
# ping pi1 from the router (pi0)
ssh pi@pi0.local
# check the dhcp leases
cat /var/lib/misc/dnsmasq.leases
ping <ip-address-of-pi1>
ping pi1.local
exit
```

Update software on `pi1`

```bash
sudo apt update
sudo apt upgrade
```

## Checking for boot errors

On `pi1`

```bash
journalctl -p err -b
```

Now you can repeat all of the above steps for `pi2` and `pi3` or you can use the [nodes_reimage.yml](Ansibl.md#playbook-for-reimaging-pi1piN) Ansible script. 

## 

## Securing your cluster

There are a number of things we can and should do to improve the security of our cluster and also the security of our home network. These should all be done for `imager0`..`imager3` as well.

### Ensure SSH is set to require key-based authentication

If you followed the instructions in this tutorial when creating your Pi images and when installing Ubuntu on `data1`, this should already be the case. But you can always check.

On every machine in the cluster, run these commands to inspect.

```bash
sudo sshd -T | grep passwordauthentication
sudo sshd -T | grep pubkeyauthentication
```

`passwordauthentication` should be `no` and `pubkeyauthentication` should be `yes`

If that's not the case, edit `/etc/ssh/sshd_config` to set these correctly:

```bash
sudo nano /etc/ssh/sshd_config
# Ensure these lines
PubkeyAuthentication yes # Or not defined-- the default is yes
PasswordAuthentication no


# Then restart the SSH daemon
sudo systemctl restart ssh
```

Once you make these changes, you'll only be able to SSH in to this machine using key based authentication. See [SSH Tips](<SSH Tips.md>) to get key based auth working before disabling password auth.

### Ensure the pi user has a password

On each machine in the cluster.

```bash
sudo passwd pi
```

Manage these passwords carefully, for example in a password manager.

### Update sudoers configuration

On each machine in the cluster, ensure that the NOPASSWD directive is NOT defined

```bash
sudo -l
```

If there's any output that looks like `(ALL) NOPASSWD: ALL` you'll need to update your sudoers configuration.

### Disable the root user

### Use Ansible vault

### Setup a firewall to protect the home network

### Setup unattended operating system updates

### Regular monitoring and auditing

### Use a passphrase on your private key

## Setting Up Remote SSH with Cloudflare Tunnel

[SSH · Cloudflare Zero Trust docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/use-cases/ssh/)

https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/use-cases/ssh/

## Remotely Powering Up the Cluster

If you ever shutdown a node in the cluster (`sudo shutdown`) it'll leave the Pi in a state that can only be powered back on by pressing the power button. As of this writing, Pis don't support wake-on-LAN. So instead, you could use a smart plug, like the Kasa Smart Plug Mini. If you connect your lab's power strip to this smart plug, you can power it off and on remotely (which will start up the Pis). Before doing this, it's best to SSH in to all of the nodes and shutdown properly to avoid data loss. The [cluster_shutdown.yml](Ansible.md#playbook-for-shutting-down-the-cluster) Ansible playbook makes this easy.

[Getting started &mdash; python-kasa documentation](https://python-kasa.readthedocs.io/en/stable/index.html)

```bash
pip install python-kasa
kasa discover
kasa --host <ip address> <command>
```

## Notes

Raspberry Pi Imager makes no changes to config.txt during customisation, but it does change cmdline.txt and it creates firstrun.sh.

### Switching to USB-Ethernet to connect to home network

If we want to switch to using Ethernet for connecting to the home network for improved performance, we can do so with a USB ethernet adapter, like this [TP-Link UE306](https://www.amazon.com/dp/B09GRL3VCN).

To keep everything else working the same, change your home network DHCP reservation for eth0 to instead point to the MAC address of the new ethernet adapter. Then you should be able to turn off the wifi on pi0 like this:

```bash
sudo rfkill block wifi
```

Then, update the routing to use the new adapter. Assuming it's named `eth1`, then like this:

```bash
# Remove the old NAT rule (assuming wlan0 was the only one)
sudo iptables -t nat -D POSTROUTING -o wlan0 -j MASQUERADE

# Add a new NAT rule for eth1
sudo iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE

# Save the updated iptables rules
sudo netfilter-persistent save
```

### Setting up pi0 as a wifi access point for lab network

Setting up `wlan0` as a WiFi access point on pi0 will let us connect wifi devices like ESP32 boards directly to the edge-lab network.

### 

Remove the existing wireless and eth0 connections:

```bash
nmcli con show
sudo nmcli con delete lan
sudo nmcli con delete preconfigured
```

Add a bridge between eth0, the ethernet interface plugged into the edge-lab switch and wlan0, the wifi interface on the Pi. Setup the wifi interface as an access point

```bash
sudo nmcli connection add con-name 'bridge-con' ifname br0 type bridge ipv4.method auto ipv6.method disabled connection.autoconnect yes stp no
sudo nmcli con modify "bridge-con" ipv4.addresses 192.168.87.1/24 ipv4.method manual
sudo nmcli connection add con-name 'lab-eth-con' ifname eth0 type bridge-slave master 'bridge-con' connection.autoconnect yes
sudo nmcli connection add con-name 'lab-hotspot' ifname wlan0 type wifi slave-type bridge master 'bridge-con' wifi.band a wifi.channel 153 wifi.mode ap wifi.ssid <yourlabssid> wifi-sec.key-mgmt wpa-psk wifi-sec.psk <yourpassword>
sudo systemctl restart NetworkManager
```

Configure `dnsmasq` to provide DHCP services over `br0` instead of `eth0` or `wlan0` directly. Adjust `/etc/dnsmasq.conf` to offer IP addresses for devices connecting through the bridge:

```bash
sudo nano /etc/dnsmasq.conf
```

`dnsmasq.conf`:

```bash
interface=br0
dhcp-range=192.168.87.11,192.168.87.99,255.255.255.0,24h
```

```bash
sudo systemctl restart dnsmasq
```

Since we plan to share an internet connection through the bridge, we need to ensure IP forwarding is enabled (as described in previous steps).

- We did this already with `echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf` previously

And ensure NAT rules are setup and using eth1 for internet traffic as noted previously:

```bash
# ensure you changed your NAT rule to use eth1 instead of wlan0
sudo iptables -t nat -D POSTROUTING -o wlan0 -j MASQUERADE
sudo iptables -t nat -A POSTROUTING -o eth1 -j MASQUERADE
sudo netfilter-persistent save
```

Finally, verify your setup by connecting a device to your newly created WiFi network. Check that the device receives an IP address within the `192.168.87.0/24` range and has internet access.
