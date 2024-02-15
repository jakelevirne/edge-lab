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

### 

### Playbooks for ERASING and reimaging pi0

See [router_ERASE.yml](../ansible/router_ERASE.yml)

Outcome: The boot partition of the USB drive in `pi0` will be reformatted, making it unbootable. The machine will reboot and fall back to the SD card, booting up as `imager0`

Notes:

- Make sure you really mean it. This will make your /dev/sda1 (USB) unbootable, which will cause the Pi to boot from SD card on restart.

- The reboot is scheduled so it doesn't cause Ansible to fail. Normally Ansible will wait for a successful reconnection after a reboot. But in this case that would be problematic because the machine will come up with a new hostname, `imager0`, when it reboots.

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini router_ERASE.yml -vvv
# It'll wait for you to press a key to continue
```

See [router_reimage.yml](../ansible/router_reimage.yml)

Outcome: The clean Raspberry Pi OS image will be restored onto the USB, with all the customizations that were setup when using the Raspberry Pi Imager. The system will reboot and the hostname of the machine will be updated to `pi0`  (as opposed to `changeme`).

Notes:

- This will install and run Clonezilla completely unattended, copying the clean Raspberry Pi OS image we created to the USB, overwriting everything on that USB.

- It assumes you've created the Clean Image, as described in the [Pi Cluster doc](<Pi Cluster.md>) and that this image is availble on the host `data1` and being shared on an NFS directory called `/srv/os_images`. 

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini router_reimage.yml -vvv
# It'll wait for you to press a key to continue
```

### Playbook for configuring pi0 as a router

See [router_config.yml](../ansible/router_config.yml)

Outcome: `pi0` will be properly configured as the router for the home lab, acting as a DHCP server for assigning IP addresses to `pi1..pi3` ethernet interfaces, and routing internet traffic from the lab over to the home router.

Notes:

- I've chosen 192.168.87.0/24 as the subnet for my lab. Make edits to router_config.yml if you want to use a different subnet.
- This playbook assigns reserved DHCP addresses to each Pi. These are based on the ethernet MAC addresses. You'll need to SSH in to each `imager` host and get these MAC addresses. These are built in to the hardware and so won't change no matter how often you re-install the OS. Run `ifconfig` and look for the hex string just after the word `ether`. Copy those MAC addresses into the task in the playbook titled "Ensure DHCP reservations are set in /etc/dnsmasq.conf"

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini router_config.yml -vvv
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
ansible-playbook -i hosts.ini nodes_ERASE.yml -vvv
# It'll wait for you to press a key to continue
```

### Playbook for reimaging pi1..piN

See [nodes_reimage.yml](../ansible/nodes_reimage.yml)

Outcome: The clean Raspberry Pi OS image will be restored onto the USBs, with all the customizations that were setup when using the Raspberry Pi Imager. The system will reboot and the hostname of the machine will be updated to `pi1`..`piN` (as opposed to `changeme`).

Notes:

- This script will only reimage machines that are currently booted into their SD cards as `imager1`..`imagerN`. It won't touch `pi0`/`imager0` and it won't touch any machines that are already booted up from their USB as `pi1`..`piN`

- `pi0` must be configured and running as the lab network router.

- This will install and run Clonezilla completely unattended, copying the clean Raspberry Pi OS image we created to the USB, overwriting everything on that USB.

- It assumes you've created the Clean Image, as described in the [Pi Cluster doc](Pi%20Cluster.md) and that this image is availble on the host `data1` and being shared on an NFS directory called `/srv/os_images`.

Run the playbook:

```bash
# Using -vvv for verbose output
ansible-playbook -i hosts.ini nodes_reimage.yml -vvv
# It'll wait for you to press a key to continue
```

### Playbook for installing MicroK8s on pi1..piN

```bash
nano install_microk8s.yml
```

```yaml
---
- name: Install Snap and MicroK8s on Debian-based machines
  hosts: pi_hosts
  become: yes
  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Install Snap
      ansible.builtin.apt:
        name: snapd
        state: present

    - name: Enable and start Snap services
      ansible.builtin.systemd:
        name: snapd.socket
        state: started
        enabled: yes
      notify: Restart Snap services

    - name: Install MicroK8s
      ansible.builtin.snap:
        name: microk8s
        classic: true
        state: present

  handlers:
    - name: Restart Snap services
      ansible.builtin.systemd:
        name: snapd.service
        state: restarted
```

To run this playbook:

```bash
ansible-playbook -i hosts.ini install_microk8s.yml
```

To run playbooks that require a secret:

```bash
ansible-playbook -i hosts.ini --ask-vault-pass reboot_cluster.yml
```
