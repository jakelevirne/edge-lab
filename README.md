# edge-lab

# 

> [!WARNING]
> This repository is a work in progress.

## A dev environment focused on edge computing

This repo contains instructions and scripts for creating a cluster of Raspberry Pis running Kubernetes that can be re-imaged at any time through a set of Ansible and Pulumi scripts. The cluster is used to run an MQTT broker, Redpanda (a Kafka compatible stream processor), a ClickHouse database for querying/analyzing the event stream data, NFS for basic file sharing, a router to separate the whole cluster into its own subnet, and various workloads for capturing and transforming event data.

The motivation behind this lab is to explore and learn the tools for handling real-time streaming data, especially in the context of a mesage-based edge/IoT architecture.

## Contents

* [Buying or Making a Rack for Your Cluster](docs/Rack.md)

* [Building the Raspberry Pi Cluster](docs/Pi Cluster.md)

* [Installing Kubernetes](docs/Kubernetes.md)

* [Scripting the Pi Cluster for Remote Operations](docs/Clean.md)

* Installing RedPanda (Kafka) and MQTT

* A Networking Detour

* Installing ClickHouse

* Streaming Sample Real-time Data

* Querying and Analyzing Real-time Data

* Building Reactive Services
