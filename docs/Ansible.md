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

Host data1
  User pi

Host pi0
  User pi

Host pi1.local
  User pi
  ProxyJump pi0

Host pi2.local
  User pi
  ProxyJump pi0

Host pi3.local
  User pi
  ProxyJump pi0

Host imager0
  User pi

Host imager1
  User pi

Host imager2
  User pi

Host imager3
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
ssh_args = -F /Users/jakelevirne/.ssh/config -o ControlMaster=auto -o ControlPersist=60s

[defaults]
host_key_checking = False
```

Setup your Ansible inventory. This will be the list of all hostnames that our scripts will need to interact with.

```bash
nano hosts.ini
```

```bash
[pi_hosts]
pi1
pi2
pi3

[imager_hosts]
imager1
imager2
imager3

[router_hosts]
pi0

[router_imager_hosts]
imager0

[nfs_hosts]
data1
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
