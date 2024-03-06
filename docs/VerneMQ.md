# Verne MQTT Broker

Fully open source, cluster-able MQTT broker. 

Here are the commands for running manually on each node, in Docker.

First, install Docker following the [instructions here](https://docs.docker.com/engine/install/debian/).

On the first node (pi1):

```bash
sudo docker run --network="host" -e "DOCKER_VERNEMQ_ALLOW_ANONYMOUS=on" -e "DOCKER_VERNEMQ_ACCEPT_EULA=yes" --name vernemq1 -d vernemq/vernemqWith the above, you'll have a single-node broker available anonymously via `mqtt://pi1.local:1883`
```

Now, on pi2:

```bash
sudo docker run -e "DOCKER_VERNEMQ_ALLOW_ANONYMOUS=on" -e "DOCKER_VERNEMQ_ACCEPT_EULA=yes" -e "DOCKER_VERNEMQ_DISCOVERY_NODE=192.168.87.101"  --network="host" --name vernemq2 -d vernemq/vernemq
```

Check the logs:

```bash
sudo docker logs vernemq2
```

Repeat on pi3 for a 3-node cluster:

```bash
sudo docker run -e "DOCKER_VERNEMQ_ALLOW_ANONYMOUS=on" -e "DOCKER_VERNEMQ_ACCEPT_EULA=yes" -e "DOCKER_VERNEMQ_DISCOVERY_NODE=192.168.87.101"  --network="host" --name vernemq3 -d vernemq/vernemq
```

Test with MQTT clients, each pointing to separate broker nodes. Pub/sub should be consistent across all three (i.e. subscribing to topic X on node 1 should mean you receive messages on that topic even if they're published to node 2 o 3).

```bash
mosquitto_sub -h 192.168.87.101 -t #
```

### Netdata monitoring of Verne

On one of the nodes, run NetData following the instructions in the [Netdata documentation](https://learn.netdata.cloud/docs/netdata-agent/installation/docker). When you then access the Netdata Agent Console via http://NODE:19999, you'll see on the right hand side that VerneMQ is automatically being monitored.

## Kubernetes VerneMQ Cluster Deployment

These are the best instructions on VerneMQ containerized cluster deployment:

[GitHub - vernemq/docker-vernemq: VerneMQ Docker image - Starts the VerneMQ MQTT broker and listens on 1883 and 8080 (for websockets).](https://github.com/vernemq/docker-vernemq)

Use helm

```bash
kubectl apply -f 00-namespace.yaml
helm repo add vernemq https://vernemq.github.io/docker-vernemq
helm install my-vernemq vernemq/vernemq -f values.yaml -n vernemq
```

`00-namespace.yaml`:

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: vernemq
```

`values.yaml`:

```yaml
replicaCount: 3
podAntiAffinity: hard
additionalEnv:
  - name: DOCKER_VERNEMQ_ACCEPT_EULA
    value: "yes"
  - name: DOCKER_VERNEMQ_ALLOW_ANONYMOUS
    value: "on"

env:
  - name: DOCKER_VERNEMQ_DISCOVERY_KUBERNETES
    value: "1"
  - name: MY_POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: DOCKER_VERNEMQ_KUBERNETES_LABEL_SELECTOR
    value: "app=vernemq,release=myinstance"
  - name: DOCKER_VERNEMQ_LOG__CONSOLE
    value: "console"
  - name: DOCKER_VERNEMQ_LOG__CONSOLE__LEVEL
    value: "debug"
```

Check the full helm-calculated manifest with the `--dry-run` and `--debug` flags:

```bash
helm upgrade my-vernemq vernemq/vernemq -f values.yaml -n vernemq --dry-run --debug
```

View and set [VerneMQ live config](https://docs.vernemq.com/live-administration/config_values) values with:

```bash
kubectl exec --namespace vernemq my-vernemq-1 -- /vernemq/bin/vmq-admin show allow_anonymous --all
kubectl exec --namespace vernemq my-vernemq-1 -- /vernemq/bin/vmq-admin set allow_anonymous=on --all
```

(`--all` shows/sets all cluster nodes)

Test [file-based auth](https://docs.vernemq.com/configuring-vernemq/file-auth) like this (note that this needs to be done on each pod):

```bash
kubectl exec --namespace vernemq -it my-vernemq-0 -- /bin/bash
vmq-passwd -c ./etc/vmq.passwd <user>
# then interactively enter and confirm the password
nano ./etc/vmq.acl
# add lines like this
user henry
topic #
```

Forward the `my-vernemq` Service port 1883 to localhost and you can now test pub/sub

```bash
mosquitto_sub -h localhost -t your_topic -i my-client-id1 -u henry -P <password>
mosquitto_pub -h localhost -t your_topic -m "foooodeyloodey" -i my-client-id2 -u henry -P 1234
```

### Netdata monitoring in K8s

With the following, netdata will monitor each of your K8s nodes, including auto-discovery and monitoring of VerneMQ, even across namespaces:

```bash
kubectl apply -f 00-namespace.yaml
helm repo add netdata https://netdata.github.io/helmchart/
helm install netdata netdata/netdata -n netdata
```

Follow the instructions after installation to identify the IP and port of your netdata dashboards. I found them at: `http://<pi-machine-IP>:19999`

Each node has its own dashboard but hopefully we can find a way to combine them.




