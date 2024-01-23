# pi5cluster

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




Use the Raspberry Pi imager to image pi1.local through piN.local
- Follow the same steps as above, but uncheck Configure wireless lan
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


  
