# Securing your cluster

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