# Setup Ansible

## On the client

### Configure SSH

```bash
nano ~/.ssh/config
```

```bash
Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_git

Host pi0.local
  User pi

Host pi1.local
  User pi
  ProxyJump pi0.local

Host pi2.local
  User pi
  ProxyJump pi0.local

Host pi3.local
  User pi
  ProxyJump pi0.local

Host data1.local
  User pi
  ProxyJump pi0.local

Host imager0.local
  User pi

Host imager1.local
  User pi

Host imager2.local
  User pi

Host imager3.local
  User pi
```

### Install and Configure ansible

Install Ansible on your control node (laptop) following these [instructions](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html). Or on a Mac, simple `brew install ansible`.

All of the configuration files below can be found in the [ansible](../ansible) directory of this repository.

Now configure ansible to rely on your SSH configurations (setup above) for connecting to managed nodes. This way, if you can connect to the machines using `ssh` from your terminal, ansible should be able to connect as well. 

```bash
cd edge-lab/ansible
nano ansible.cfg
```

```bash
[ssh_connection]
ssh_args = -F /Users/<your_username>/.ssh/config -o ControlMaster=auto -o ControlPersist=60s

[defaults]
host_key_checking = False
```

Setup your Ansible inventory. This will be the list of all hostnames that our scripts will need to interact with.

```bash
nano hosts.ini
```

```bash
[pi_hosts]
pi1.local
pi2.local
pi3.local

[imager_hosts]
imager1.local
imager2.local
imager3.local

[router_hosts]
pi0.local

[router_imager_hosts]
imager0.local

[nfs_hosts]
data1.local
```

TODO: Instructions for setting up ansible vault; also update all the playbooks to use the vault (vars_files)

### Playbooks for ERASING and reimaging pi0

See [router_ERASE.yml](../ansible/router_ERASE.yml)

Outcome: The boot partition of the USB drive in `pi0` will be reformatted, making it unbootable. The machine will reboot and fall back to the SD card, booting up as `imager0`

Notes:

- Make sure you really mean it. This will make your /dev/sda1 (USB) unbootable, which will cause the Pi to boot from SD card on restart.

- The reboot is scheduled so it doesn't cause Ansible to fail. Normally Ansible will wait for a successful reconnection after a reboot. But in this case that would be problematic because the machine will come up with a new hostname, `imager0`, when it reboots.

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini --ask-vault-pass router_ERASE.yml -vvv
# It'll wait for you to press a key to continue
```

See [router_reimage.yml](../ansible/router_reimage.yml)

Outcome: The clean Raspberry Pi OS image will be restored onto the USB, with all the customizations that were setup when using the Raspberry Pi Imager. The system will reboot and the hostname of the machine will be updated to `pi0`  (as opposed to `changeme`).

Notes:

- This will install and run Clonezilla completely unattended, copying the clean Raspberry Pi OS image we created to the USB, overwriting everything on that USB.

- It assumes you've created the Clean Image, as described in the [Pi Cluster doc](<Pi Cluster.md>) and that this image is available on the host `data1` and being shared on an NFS directory called `/srv/os_images`. 

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini --ask-vault-pass router_reimage.yml -vvv
# It'll wait for you to press a key to continue
```

### Playbook for configuring pi0 as a router

See [router_config.yml](../ansible/router_config.yml)

Outcome: `pi0` will be properly configured as the router for the home lab, acting as a DHCP server for assigning IP addresses to `pi1..pi3` ethernet interfaces, and routing internet traffic from the lab over to the home router.

Notes:

- I've chosen 192.168.87.0/24 as the subnet for my lab. Make edits to router_config.yml if you want to use a different subnet.
- This playbook assigns reserved DHCP addresses to each Pi. These are based on the ethernet MAC addresses of your Raspberry Pis so **must be edited**. You'll need to SSH in to each `imager` host and get these MAC addresses. These are built in to the hardware and so won't change no matter how often you re-install the OS. Run `ifconfig` and look for the hex string just after the word `ether`. Copy those MAC addresses into the task in the playbook titled "Ensure DHCP reservations are set in /etc/dnsmasq.conf"

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini --ask-vault-pass router_config.yml -vvv
```

### Playbook for ERASING pi1..piN

See [nodes_ERASE.yml](../ansible/nodes_ERASE.yml)

Outcome: The boot partition of the USB drive in `pi1`..`piN` will be reformatted, making those drives unbootable. The machines will reboot and fall back to the SD card, booting up as `imager1`..`imagerN`

Notes:

- Make sure you really mean it. This will make your /dev/sda1 (USB) unbootable, which will cause the Pis to boot from SD card on restart.

- `pi0` must be configured and running as the lab network router.

- The reboot is scheduled so it doesn't cause Ansible to fail. Normally Ansible will wait for a successful reconnection after a reboot. But in this case that would be problematic because the machines will come up with new hostnames, `imager1`..`imagerN`, when they reboot.

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini --ask-vault-pass nodes_ERASE.yml -vvv
# It'll wait for you to press a key to continue
```

### Playbook for reimaging pi1..piN

See [nodes_reimage.yml](../ansible/nodes_reimage.yml)

Outcome: The clean Raspberry Pi OS image will be restored onto the USBs, with all the customizations that were setup when initially using the Raspberry Pi Imager. The system will reboot and the hostnames of the machines will be updated to `pi1`..`piN` (as opposed to `changeme`).

Notes:

- This script will only reimage machines that are currently booted into their SD cards as `imager1`..`imagerN`. It won't touch `pi0`/`imager0` and it won't touch any machines that are already booted up from their USB as `pi1`..`piN`

- `pi0` must be configured and running as the lab network router for this script to work, and your `~/.ssh/config` must be setup correctly (see above).

- This will install and run Clonezilla completely unattended, copying the clean Raspberry Pi OS image we created to the USB, overwriting everything on that USB.

- It assumes you've created the Clean Image, as described in the [Pi Cluster doc](Pi%20Cluster.md) and that this image is available on the host `data1` and being shared on an NFS directory called `/srv/os_images`.

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini --ask-vault-pass nodes_reimage.yml -vvv
# It'll wait for you to press a key to continue
```

### Playbook for configuring pi1..piN

See [nodes_config.yml](../ansible/nodes_config.yml)

Outcome: `pi1`..`piN` will be properly configured and ready for software installs (e.g. microk8s). This script simply updates all software already on the Pis (`sudo apt update && sudo apt upgrade)

Notes:

- 

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini --ask-vault-pass nodes_config.yml -vvv
```



### Playbook for installing MicroK8s on pi1..piN

See [microK8s_install.yml](../ansible/microK8s_install.yml)

Outcome: Each node in the cluster except the router (pi0) will have MicroK8s installed and running. Hostpath-storage will be enabled on pi1, which will enable it for the entire cluster once nodes join pi1 in the future. After this script is run, the MicroK8s nodes will not yet be joined together in a single cluster.

Notes:

- This will install MicroK8s separately on each node. They won't yet form a K8s cluster.
- The script will cause a reboot.

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini --ask-vault-pass microK8s_install.yml -vvv
# It'll wait for you to press a key to continue
```

 

### Playbook for Joining Nodes to the MicroK8s Cluster

See [microK8s_join.yml](../ansible/microK8s_join.yml)

Outcome: Ensure all nodes are joined together into a single K8s cluster

Notes:

- This script doesn't install MicroK8s; it expects that it's already running on all the nodes.
- This script runs different tasks (add-node) on pi1 than on the other machines (join-node). Pi1 acts as the primary node, 
- The script will cause a reboot.

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini --ask-vault-pass microK8s_join.yml -vvv
# It'll wait for you to press a key to continue
```





### Playbook for shutting down the cluster

See [cluster_shutdown.yml](../ansible/cluster_shutdown.yml)

Outcome: The entire cluster will be shutdown gracefully, starting with the cluster nodes (`pi1`..`piN`), then the storage server (`data1`), and finally the router (`pi0`).

Notes:

- This playbook makes use of the Ansible vault because it needs the sudo password for `data1` 

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini cluster_shutdown.yml -vvv
# It'll wait for you to press a key to continue
```
