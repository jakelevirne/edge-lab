# Envoy Gateway

## Motivation

We're running a clustered MQTT server, VerneMQ. It deploys nicely into K8s and can run with multiple replicas, automatically creating a cluster. Connecting an MQTT client to any of the replica pods and publishing a message will successfully send that message to client subscribers on any other pod. Now we want to setup ingress so that there's one route for MQTT clients to use (e.g. mqtt.edge-lab.dev). We can do this with an Ingress controller like [Voyager](https://github.com/voyagermesh/voyager), which is referenced in the [VerneMQ docs](https://docs.vernemq.com/guides/vernemq-on-kubernetes). However, Voyager requires a license key with unclear pricing and terms of use. In addition, K8s is moving towards the [Gateway API](https://gateway-api.sigs.k8s.io/) as the next generation of ingress. Given this, I wanted to explore Envoy Gateway, a CNCF project that implements the new Gateway API. However TCP load balancing by source IP hash is not yet implemented in Envoy Gateway (see [Adding BTP support for TCPRoute · Issue #2880 · envoyproxy/gateway · GitHub](https://github.com/envoyproxy/gateway/issues/2880)). Once it is, this should be a viable option for ingress.



## Envoy Gateway Instead

Configuring TCP routing and source (IP) hash load balancing with HAProxy doesn't seem straightforward or aligned yet with the new K8s Gateway API specification. Instead, let's try out Envoy Gateway.

[TCP Routing | Envoy Gateway](https://gateway.envoyproxy.io/v0.6.0/user/tcp-routing/)

Installation of the latest release:

```bash
helm install eg oci://docker.io/envoyproxy/gateway-helm --version v0.0.0-latest -n envoy-gateway-system --create-namespace
```

`gateway-class.yaml`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy-gateway
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
```

`vernemq-gateway.yaml`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: vernemq-gateway
  namespace: vernemq
spec:
  gatewayClassName: envoy-gateway
  listeners:
  - name: vernemq-listener
    protocol: TCP
    port: 1883
    allowedRoutes:
      kinds:
      - kind: TCPRoute
```

`vernemq-tcproute.yaml`:

```yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: vernemq-route
  namespace: vernemq
spec:
  parentRefs:
  - name: vernemq-gateway
    namespace: vernemq
  rules:
  - backendRefs:
    - group: ""
      kind: Service
      name: my-vernemq
      port: 1883
```

