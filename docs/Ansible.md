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
```

### Configure ansible

```bash
cd ~/dev/pi5cluster
nano ansible.cfg
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
pi1.local
pi2.local
pi3.local
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
