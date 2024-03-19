# MQTT Internet Gateway

To get internet MQTT traffic routed to our cluster there are several different approaches we can take. We could setup port forwarding on our home router for MQTT traffic (port 1883) and use dynamic DNS to keep a domain name pointed to our current public IP address from our home internet provider. But this raises both security concerns (exposing home internet ports to public traffic) as well as maintenance concerns (maintaining our dynamic DNS entry in case our public IP address changes).

Instead, we'll setup a virtual machine in the cloud as the Gatway to our edge lab cluster. Then we'll connect our cloud gateway vm to pi0 through a VPN powered by wireguard. While this approach will cost us a few dollars/month, and limit our outbound traffic 



## Setup a Cloud VM

By running a virtual machine in the cloud, you'll be able to have a public IP address that can accept internet MQTT traffic and route it to your edge lab cluster. There are many options for running a virtual machine in the cloud, but I'm partial to DigitalOcean since I had an amazing experience when I worked there in the past. Any of their [Droplet](https://www.digitalocean.com/pricing/droplets) (VM) offerings would work; I've chosen the 1 GiB, 1 vCPU Regular Basic droplet which includes 1 TiB of (outbound) network bandwidth. DigitalOcean's [Production-Ready Droplet guide](https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/) gives a very good walkthrough for setting up a virtual machine you plan to leave in publicly exposed to the internet. Here are some additional notes on the steps I took:

- I chose NYC3 as my data center, though any one should work for our purposes
- I chose Ubuntu 22.04 as my image because it is the most recent long-term support (LTS) release
- I chose the Basic, Regular, $6/month Droplet
- I enabled IPv6 as per the guide, but did not add improved metrics monitoring (because I plan to install Netdata)
- For everything else, I followed the guide, including the creation of a free cloud firewall, like this:
  ![DigitalOcean Firewall](../media/DigitalOcean Firewall.png)
  - I left Outbound Rules unchanged from the default, which allows all outbound traffic
  - I added two Inbound Rules to 1) allow for MQTT traffic (TCP port 1883) from the any internet client and 2) allow for a WireGuard connection (UDP port 51820) from my edge-lab which we'll setup shortly. For added security, since my home internet IP address rarely changes, I've restricted the source for WireGuard traffic to only be my home public IP address (which I found with a [Google search](https://www.google.com/search?q=what%27s+my+ip+address)).
- After starting the Droplet, I also created a [Reserved IP](https://docs.digitalocean.com/products/networking/reserved-ips/), which costs nothing if it remains attached to a Droplet and which gives you the ability to migrate from one Droplet to another (e.g. for failover or resizing) without having to change your public IP address.



## Setup WireGuard

WireGuard is a VPN (virtual private network) interface that's built into modern distributions of Linux. It will allow us to treat our cloud VM and pi0 as if they're on a single subnet without exposing any of pi0's ports to the open internet. 

Install WireGuard on both pi0 and your cloud VM:

```bash
sudo apt update
sudo apt install wireguard
```



On the cloud server, generate a private/public keypair:

```bash
wg genkey | tee server_private.key | wg pubkey > server_public.key
```

On pi0, generate a private/public keypair:

```bash
wg genkey | tee pi0_private.key | wg pubkey > pi0_public.key
```



On the cloud VM:

```bash
sudo nano /etc/wireguard/wg0.conf
```



`wg0.conf`:

```bash
[Interface]
Address = 10.200.200.1/24
PrivateKey = SERVER_PRIVATE_KEY
ListenPort = 51820

[Peer]
PublicKey = PI0_PUBLIC_KEY
AllowedIPs = 10.200.200.2/32
```

Where SERVER_PRIVATE_KEY and PI0_PUBLIC_KEY are copies of the contents of the files you generated above. Be careful to include the private key you generated on your cloud VM along with the public key you created on pi0.

```bash
sudo wg-quick up wg0
```



On pi0:

```bash
sudo nano /etc/wireguard/wg0.conf
```



`wg0.conf`:

```bash
[Interface]
Address = 10.200.200.2/24
PrivateKey = PI0_PRIVATE_KEY

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = CLOUD_VM_IP:51820
AllowedIPs = 10.200.200.1/32
PersistentKeepalive = 25
```

As above, work carefully to copy the contents of the right keyfiles. Once you've created these config files you can delete server_private.key, server_public.key, pi0_private.key, and pi0_public.key files from your home directory.

```bash
sudo wg-quick up wg0
```



Now, you can check the status of the WireGuard VPN by running this command on either machine:

```bash
sudo wg
```



And you can test the connection by running this command on pi0:

```bash
ping 10.200.200.1
```



And this command on the cloud VM:

```bash
ping 10.200.200.2
```



If those don't work, carefully check over all the steps above to ensure you got your cloud firewall, keys, and IP addresses all configured properly. Once you're able to successfully test the connection between the two machines, make the connection permanent so it continues even after a reboot.



On both machines, run:

```bash
sudo chmod 600 /etc/wireguard/wg0.conf
sudo systemctl enable wg-quick@wg0.service
```



### Configure MQTT Internet Traffic Routing

#### On the cloud VM

Check if IP forwarding is enabled:

```bash
sysctl net.ipv4.ip_forward
```

If the output is `net.ipv4.ip_forward = 0`, enable IP forwarding by running:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```

And configure iptables to forward traffic:

```bash
# Forward incoming traffic on port 1883 to the VPN address of pi0
sudo iptables -t nat -A PREROUTING -p tcp --dport 1883 -j DNAT --to-destination 10.200.200.2

# Masquerade outgoing packets from port 1883 to make them appear as if they are coming from the cloud VM
sudo iptables -t nat -A POSTROUTING -o wg0 -p tcp --dport 1883 -j MASQUERADE
```

And make these rules persistent:

```bash
sudo apt-get install iptables-persistent
```

You should be prompted to save the existing rules. If you're not, run this explicit save command:
```bash
sudo netfilter-persistent save
```

#### On pi0

```bash
# Forward incoming traffic on port 1883 to the specific IP in the lab network
sudo iptables -t nat -A PREROUTING -i wg0 -p tcp --dport 1883 -j DNAT --to-destination 192.168.87.252

# Ensure the response packets can find their way back
sudo iptables -t nat -A POSTROUTING -o eth0 -p tcp --dport 1883 -d 192.168.87.252 -j MASQUERADE
```

Since `iptables-persistent` is already installed on pi0, just run this command to persist these changes:

```bash
sudo netfilter-persistent save
```

With this setup you should now be able to connect an MQTT client through your cloud VM's public IP address and publish and subscribe to messages. The problem with this configuration is that all traffic will appear to the K8s ingress controller as if it's coming from the same IP address, making it impossible to load balance based on client IP. We'll correct this in the next section.



### Pass client IPs via PROXY protocol

Above, we use iptables based routing, with masquerading on the cloud VM to get incoming MQTT reqests to our cluster. Instead, we'll replace this with HAProxy on the cloud VM, which includes support for the [PROXY protocol](https://www.haproxy.org/download/1.8/doc/proxy-protocol.txt) which provides a convenient way to safely transport connection information such as a client's address across multiple layers of NAT or TCP. 

On your cloud VM:

```bash
sudo apt update
sudo apt install haproxy
```



```bash
sudo nano /etc/haproxy/haproxy.cfg
```

Add the following to the end of `haproxy.cfg`:

```bash
frontend mqtt_frontend
    bind *:1883
    mode tcp
    default_backend mqtt_backend

backend mqtt_backend
    mode tcp
    server pi0 10.200.200.2:1883 send-proxy
```

Critically, the send-proxy setting on the backend configuration instructs HAProxy to append PROXY protocol headers to the packets it forwards on to pi0.

Now we need to iptable based NAT on the cloud VM (otherwise it will conflict with the work that HAProxy is now doing):

```bash
sudo iptables -t nat -L --line-numbers -n -v
# Assuming there are no other PREROUTING or POSTROUTING rules, we delete
# the rules we just created, referencing them by line number (1)
sudo iptables -t nat -D PREROUTING 1
  sudo iptables -t nat -D POSTROUTING 1
# Persist these changes
sudo netfilter-persistent save
```



And finally, we [configure Voyager](https://voyagermesh.com/docs/v2024.3.18/guides/ingress/configuration/accept-proxy/) (our K8s ingress controller) to accept PROXY headers. Edit `verne-ingress.yaml` to add an accept-proxy annotation, like this:

```yaml
apiVersion: voyager.appscode.com/v1
kind: Ingress
metadata:
  name: verne-ingress
  namespace: vernemq
  annotations:
    ingress.appscode.com/keep-source-ip: "true"
    ingress.appscode.com/accept-proxy: "true"

spec:
  rules:
  - host:
    tcp:
      port: 1883
      backend:
        service:
          name: my-vernemq
          port:
            number: 1883
        loadBalanceOn: source
```

And apply these changes:

```bash
kubectl apply -f verne-ingress.yaml
```

Now when you connect an MQTT client to your cloud VM's public IP address, the client source IP should flow all the way through to HAProxy/Voyager ingress inside your K8s cluster so it can be used for load balancing. Watch the logs of the voyager-verne-ingress service while you connect and you should see log entries like this:

```
voyager-verne-ingress-f9fcb5c95-5lfrp haproxy Connect from 71.234.151.142:65127 to 10.17.0.5:1883 (tcp-0_0_0_0-1883/TCP)
voyager-verne-ingress-f9fcb5c95-5lfrp haproxy Connect from 174.196.187.111:6309 to 10.17.0.5:1883 (tcp-0_0_0_0-1883/TCP)
```

Where the "from" address reflects the real public IP address of the client you're using (which you can find with a [Google search](https://www.google.com/search?q=what%27s+my+ip+address) from your client).

With `ingress.appscode.com/accept-proxy` set to `true` ,  Voyager will configure HAProxy to expect PROXY protocol headers on all incoming traffic. This works well for internet traffic coming in through our cloud VM because we configured it to `send-proxy`. But if we have local traffic (e.g. devices connect directly to pi0's wireless interface), they won't be sending PROXY protocol headers. It's not clear if there's a way to configure a single Voyager Ingress to selectively apply `accept-proxy` to different hosts. So instead, we'll create a separate Ingress for local connections.

`verne-ingress-local.yaml`:

```yaml  
apiVersion: voyager.appscode.com/v1
kind: Ingress
metadata:
  name: verne-ingress-local
  namespace: vernemq
  annotations:
    ingress.appscode.com/keep-source-ip: "true"

spec:
  rules:
  - host:
    tcp:
      port: 1883
      backend:
        service:
          name: my-vernemq
          port:
            number: 1883
        loadBalanceOn: source
```

```bash
kubectl apply -f verne-ingress-local.yaml
```



Now you should have a new service, voyager-verne-ingress-local, with it's own External IP provided by MetalLB. Notice above that we did not include the `ingress.appscode.com/accept-proxy` annotation, so this Ingress will not require that incoming traffic have PROXY headers. Devices that are local to the Pi cluster network should use this new ingress IP address for connecting to the MQTT broker. Messages will still be published to all subscribers of the broker regardless of which ingress they used to access the broker.



