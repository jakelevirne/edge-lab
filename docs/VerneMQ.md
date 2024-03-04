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




