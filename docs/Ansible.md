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

Host pi1
  User pi
  ProxyJump pi0

Host pi2
  User pi
  ProxyJump pi0

Host pi3
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
nano edge-lab/ansible/ansible.cfg
```

```bash
[ssh_connection]
ssh_args = -F /Users/jakelevirne/.ssh/config -o ControlMaster=auto -o ControlPersist=60s

[defaults]
host_key_checking = False
```

```bash
nano hosts.ini
```

```bash
[pi_hosts]
pi1
pi2
pi3
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
