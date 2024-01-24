# pi5cluster

## pi0 - router
Use the Raspberry Pi imager to image pi0.local
- Device: Raspberry Pi 5, OS: Raspberry Pi OS Lite (64-bit), Storage: SD card
- Edit Settings
  - Set hostname to pi0.local
  - Uncheck username and password
  - Configure wireless lan
  - Set locale settings
  - Under Services, enable SSH, allow public-key auth only, and paste in public key

pi0 will be setup as the router, as follows:

```
sudo apt update
sudo apt upgrade
# check locale and datetime
locale
# run if wrong:
sudo dpkg-reconfigure locales
# check timezone
timedatectl
# change timezone if wrong:
sudo timedatectl set-timezone America/New_York
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
# first move the existing one. it only contains comments.
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.BAK.conf
sudo nano /etc/dnsmasq.conf
# Add the following lines to a new blank /etc/dnsmasq.conf
interface=eth0
dhcp-range=192.168.87.2,192.168.87.100,255.255.255.0,24h



# restart dnsmasq
sudo systemctl restart dnsmasq
# apply all configurations
sudo systemctl restart NetworkManager

#TODO: IPv6
#chatglpt prompt: I'm following these steps to configure my headless raspberry pi as a router. Do I need to do anything differently if I also want everything to work for ipv6?. And then paste in all of the above.
```


## pi1 .. piN cluster servers

Use the Raspberry Pi imager to image pi1.local through piN.local
- Follow the same steps as above, but uncheck Configure wireless lan
- Stop before the NetworkManager step
- Connect this pi to the same switch as pi0 and power up

Test as follows:
```
ssh pi@pi0.local
# check the dhcp leases
cat /var/lib/misc/dnsmasq.leases
ping <ip-address-of-pi1>
exit
# from laptop, proxyjump to pi1
ssh -J pi@pi0.local pi@pi1.local
# ping router from pi1
ping 192.168.87.1
# ping external site from pi1
ping www.cnn.com
#update pi1
sudo apt update
sudo apt upgrade
```

## Benchmarking

https://www.tomshardware.com/how-to/raspberry-pi-benchmark-vcgencmd

## NAS
On pi0.local:
Step 1: Identify the USB Drive
Insert the USB drive into the Raspberry Pi.
Open a terminal and list all connected disks:
bash
Copy code
sudo fdisk -l
Identify your USB drive (e.g., /dev/sda or /dev/sdb).
Step 2: Format the USB Drive
Format the USB drive as ext4 (replace /dev/sdX1 with your actual device):
bash
Copy code
sudo mkfs.ext4 /dev/sdX1
Wait for the process to complete.
Step 3: Create a Mount Point
Create a directory to mount your USB drive:
bash
Copy code
sudo mkdir /mnt/nas
Step 4: Mount the USB Drive
Mount the USB drive:
bash
Copy code
sudo mount /dev/sdX1 /mnt/nas
To automatically mount the drive on boot, edit /etc/fstab:
bash
Copy code
sudo nano /etc/fstab
Add a line for the USB drive:
bash
Copy code
/dev/sdX1 /mnt/nas ext4 defaults 0 2
Save and close the file.
Step 5: Install NFS Server
Install the NFS server package:
bash
Copy code
sudo apt update
sudo apt install nfs-kernel-server
Step 6: Configure NFS Export
Edit the NFS export file:
bash
Copy code
sudo nano /etc/exports
Add the following line to share the drive:
bash
Copy code
/mnt/nas <network>(rw,sync,no_subtree_check)
Replace <network> with your network range, e.g., 192.168.87.0/24.
Apply the export settings:
bash
Copy code
sudo exportfs -ra
Step 7: Adjust Permissions and Ownership
Set the appropriate permissions:
bash
Copy code
sudo chown -R pi:pi /mnt/nas
sudo chmod -R 755 /mnt/nas
Replace pi:pi with your desired user and group.
Step 8: Restart and Enable NFS
Restart the NFS service:
bash
Copy code
sudo systemctl restart nfs-kernel-server
Enable NFS to start on boot:
bash
Copy code
sudo systemctl enable nfs-kernel-server
Step 9: Accessing the Shared Drive from Client Machines
On a client Linux machine, create a mount point:
bash
Copy code
sudo mkdir /mnt/nas
Mount the shared drive (replace RASPBERRYPI_IP with your Raspberry Pi's IP address):
bash
Copy code
sudo mount RASPBERRYPI_IP:/mnt/nas /mnt/nas
