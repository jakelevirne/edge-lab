# Envoy Gateway

## Motivation

We're running a clustered MQTT server, VerneMQ. It deploys nicely into K8s and can run with multiple replicas, automatically creating a cluster. Connecting an MQTT client to any of the replica pods and publishing a message will successfully send that message to client subscribers on any other pod. Now we want to setup ingress so that there's one route for MQTT clients to use (e.g. mqtt.edge-lab.dev). We can do this with an Ingress controller like [Voyager](https://github.com/voyagermesh/voyager), which is referenced in the [VerneMQ docs](https://docs.vernemq.com/guides/vernemq-on-kubernetes). However, Voyager requires a license key with unclear pricing and terms of use. In addition, K8s is moving towards the [Gateway API](https://gateway-api.sigs.k8s.io/) as the next generation of ingress. Given this, 
