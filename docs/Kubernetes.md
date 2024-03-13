## Kubernetes

[Kubernetes 101: Deploy Your First Application with MicroK8s - The New Stack](https://thenewstack.io/kubernetes-101-deploy-your-first-application-with-microk8s/)

[Getting started with Redpanda in Kubernetes](https://redpanda.com/blog/manage-clusters-k8s-streaming-data)

[Tools To Make Your Terminal DevOps and Kubernetes Friendly](https://www.linkedin.com/pulse/tools-make-your-terminal-devops-kubernetes-friendly-maryam-tavakkoli/)

### Enable MicroK8s add-ons

On one of the cluster nodes:

```bash
# Need to create a storage class
# 'storage' is deprecated and will soon be removed. Please use 'hostpath-storage' instead
# microk8s enable storage
microk8s enable hostpath-storage
#TODO: Add this to ansible
```

```bash
# Setup the Metal Load Balancer
# TODO 
```

### Setup client access to the K8s cluster

MacOS

```bash
brew install kubectl
```

If the cluster is on a different subnet than you're client, ensure proper routing (first IP is the cluster subnet, second IP is the address of the router that connects the subnets):

```bash
sudo route -n add -net 192.168.87.0/24 192.168.86.X >/dev/null 2>&1
```

This will establish the route temporarily (until reboot). To establish it permanently, a lightweight approach is to add the above to your ~/.zshrc file

```bash
nano ~/.zshrc
# Add this line to the bottom:
sudo route -n add -net 192.168.87.0/24 192.168.86.200 >/dev/null 2>&1
```

If you don't want to be prompted for a sudo password every time you start a new shell, do this:

```bash
sudo visudo
# At the end of the file, add:
YOUR_USERNAME ALL=(ALL) NOPASSWD: /sbin/route -n add -net 192.168.87.0/24 192.168.86.200
# Where YOUR_USERNAME is your Mac username and the command needs to match up with the above
```

Close and reopen your terminal, or `source ~/.zshrc` and you should now be able to ping machines on the cluster subnet (192.168.87.0/24 in the above example).

Note that with this approach, if you reboot your machine and try to use your browser (or any other tool) to access the cluster subnet before opening a terminal it won't work because the route won't be set yet.

Get the kubeconfig from the cluster by running the following on a cluster machine:

```bash
microk8s kubectl config view --minify --flatten  > kubeconfig.yaml
```

Transfer this file to the client and create an ENV variable to point to it. Like this, updating the file path as appropriate:

```bash
export KUBECONFIG=~/dev/pi5cluster/k8s/pi-kubeconfig
```

Edit the kubeconfig and update the `server` line so it points to one of the cluster machines.

Now you can run kubectl commands against the cluster. If you want, you can change the namespace of the current context so you don't have to type `--namespace` over and over again in your commands

```bash
kubectl config set-context --current --namespace=redpanda
# switch back to the default namespace:
kubectl config set-context --current --namespace=default
```

## RedPanda (Kafka)

[Deploy a Local Development Cluster with kind or minikube | Redpanda Docs](https://docs.redpanda.com/current/deploy/deployment-option/self-hosted/kubernetes/local-guide/)

Copied and pasted here to make it easier to define a namespace.

**This command will make it so we don't have to specify a namespace in every kubectl command below:**

```bash
kubectl config set-context --current --namespace=redpanda
```

## Deploy Redpanda and Redpanda Console

In this step, you deploy Redpanda with self-signed TLS certificates. Redpanda Console is included as a subchart in the Redpanda Helm chart.

- Helm + Operator

- Helm
1. Make sure that you have permission to install custom resource definitions (CRDs):
   
   ```bash
   kubectl auth can-i create CustomResourceDefinition --all-namespaces
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   You should see `yes` in the output.
   
   You need these cluster-level permissions to install [cert-manager](https://cert-manager.io/docs/) and Redpanda Operator CRDs in the next steps.

2. Install [cert-manager](https://cert-manager.io/docs/installation/helm/) using Helm:
   
   ```bash
   helm repo add jetstack https://charts.jetstack.io
   helm repo update
   helm install cert-manager jetstack/cert-manager --set installCRDs=true --namespace cert-manager --create-namespace
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   TLS is enabled by default. The Redpanda Helm chart uses cert-manager to manage TLS certificates by default.

3. Install the Redpanda Operator custom resource definitions (CRDs):
   
   ```bash
   kubectl kustomize "https://github.com/redpanda-data/redpanda-operator//src/go/k8s/config/crd?ref=v2.1.14-23.3.4" \
      | kubectl apply -f -
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

4. Deploy the Redpanda Operator:
   
   ```bash
   helm repo add redpanda https://charts.redpanda.com
   helm upgrade --install redpanda-controller redpanda/operator \
    --set image.tag=v2.1.14-23.3.4 \
    --create-namespace
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   If you already have Flux installed and you want it to continue managing resources across the entire cluster, use the `--set enableHelmControllers=false` flag. This flag prevents the Redpanda Operator from deploying its own set of Helm controllers that may conflict with those installed with Flux.

5. Ensure that the Deployment is successfully rolled out:
   
   ```bash
   kubectl rollout status --watch deployment/redpanda-controller-operator
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   deployment "redpanda-controller-operator" successfully rolled out

6. Install a [Redpanda custom resource](https://docs.redpanda.com/current/reference/k-crd/) in the same namespace as the Redpanda Operator:
   
   `redpanda-cluster.yaml`
   
   ```yaml
   apiVersion: cluster.redpanda.com/v1alpha1
   kind: Redpanda
   metadata:
    name: redpanda
   spec:
    chartRef: {}
    clusterSpec:
      external:
        domain: customredpandadomain.local
      statefulset:
        initContainers:
          setDataDirOwnership:
            enabled: true
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   ```bash
   kubectl apply -f redpanda-cluster.yaml
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

7. Wait for the Redpanda Operator to deploy Redpanda using the Helm chart:
   
   ```bash
   kubectl get redpanda --watch
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   NAME       READY   STATUS
   redpanda   True    Redpanda reconciliation succeeded
   
   This step may take a few minutes. You can watch for new Pods to make sure that the deployment is progressing:
   
   ```bash
   kubectl get pod
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   If it’s taking too long, see [Troubleshoot](https://docs.redpanda.com/current/deploy/deployment-option/self-hosted/kubernetes/local-guide/#troubleshoot).

## Start streaming

Each Redpanda broker comes with `rpk`, which is a CLI tool for connecting to and interacting with Redpanda brokers. You can use `rpk` inside one of the Redpanda broker’s Docker containers to create a topic, produce messages to it, and consume messages from it.

1. Create an alias to simplify the `rpk` commands:
   
   ```bash
   alias internal-rpk="kubectl exec -i -t redpanda-0 -c redpanda -- rpk"
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

2. Create a topic called `twitch-chat`:
   
   - Helm + Operator
   
   - Helm

3. Create a [Topic resource](https://docs.redpanda.com/current/manage/kubernetes/k-manage-topics/):
   
   `topic.yaml`
   
   ```yaml
   apiVersion: cluster.redpanda.com/v1alpha1
   kind: Topic
   metadata:
    name: twitch-chat
   spec:
    kafkaApiSpec:
      brokers:
        - "redpanda-0.redpanda.<namespace>.svc.cluster.local:9093"
        - "redpanda-1.redpanda.<namespace>.svc.cluster.local:9093"
        - "redpanda-2.redpanda.<namespace>.svc.cluster.local:9093"
      tls:
        caCertSecretRef:
          name: "redpanda-default-cert"
          key: "ca.crt"
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

4. Apply the Topic resource in the same namespace as your Redpanda cluster:
   
   ```bash
   kubectl apply -f topic.yaml
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

5. Check the logs of the Redpanda Operator to confirm that the topic was created:
   
   ```bash
   kubectl logs -l app.kubernetes.io/name=operator -c manager
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   You should see that the Redpanda Operator reconciled the Topic resource.
   
   Example output
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

6. Describe the topic:
   
   ```bash
   internal-rpk topic describe twitch-chat
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   Expected output:

7. Produce a message to the topic:
   
   ```bash
   internal-rpk topic produce twitch-chat
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

8. Type a message, then press Enter:
   
   ```text
   Pandas are fabulous!
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   Example output:
   
   ```text
   Produced to partition 0 at offset 0 with timestamp 1663282629789.
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

9. Press Ctrl+C to finish producing messages to the topic.

10. Consume one message from the topic:
    
    ```bash
    internal-rpk topic consume twitch-chat --num 1
    ```

# Getting Ingress Working

## MetalLB

This will be used simply to provide an external IP to the HAProxy Kubernetes Ingress service

```bash
helm repo add metallb https://metallb.github.io/metallb
helm repo update
helm install metallb metallb/metallb --create-namespace \
--namespace metallb-system
```

`metallb-ip-pool.yaml`:

```yaml
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.87.250-192.168.87.255
```

```bash
kubectl apply -f metallb-ip-pool.yaml
```

`metallb-l2adv.yaml`:

```yaml
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default-l2
  namespace: metallb-system
spec:
  ipAddressPools:
  - default-pool
```

## HAProxy

HA Proxy will do TLS termination, routing, and load balancing

```bash
helm repo add haproxytech https://haproxytech.github.io/helm-charts
helm repo update
helm install haproxy-kubernetes-ingress haproxytech/kubernetes-ingress \
  --create-namespace \
  --namespace haproxy-controller \
  --set controller.ingressClass=null
```

### Set HAProxy to be of type LoadBalancer

`values.yaml`:

```yaml
controller:
  service:
    type: LoadBalancer
```

```bash
haproxy % helm upgrade haproxy-kubernetes-ingress haproxytech/kubernetes-ingress \
  --create-namespace \
  --namespace haproxy-controller \
  --set controller.ingressClass=null \
  -f values.yaml
```

## CertManager

CertManager handles automatic provisioning of LetsEncrypt certs

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --set installCRDs=true \
  --namespace cert-manager  \
  --create-namespace
kubectl create secret generic cloudflare-api-token-secret --from-literal=api-token='YOUR_CLOUDFLARE_API_TOKEN' -n cert-manager
```

Setup a ClusterIssuer. `letsencrypt-clusterissuer.yaml`:

```yaml
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-issuer
spec:
  acme:
    # server: https://acme-staging-v02.api.letsencrypt.org/directory  # Staging URL
    server: https://acme-v02.api.letsencrypt.org/directory # Production URL
    email: youremail@example.com
    privateKeySecretRef:
      name: letsencrypt-private-key
    solvers:
    - dns01:
        cloudflare:
          email: youremail@example.com
          apiTokenSecretRef:
            name: cloudflare-api-token-secret
            key: api-token
```

```bash
kubectl apply -f letsencrypt-clusterissuer.yaml
```

The above assumes you're using Cloudflare for your nameservers. If you're not, you'll need to setup a different solver by following [certmanager documentation](https://cert-manager.io/docs/configuration/acme/dns01/)

### Test it out with a simple HelloWorld service

`hello-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-world
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello-world
  template:
    metadata:
      labels:
        app: hello-world
    spec:
      containers:
      - name: hello-world
        image: nginxdemos/hello
        ports:
        - containerPort: 80
```

```bash
kubectl apply -f hello-deployment.yaml
```

(At this point you can access the hello-world web app by first port forwarding from one of your pods and then hitting localhost. But port forwarding is temporary.)

`hello-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-world-service
spec:
  type: ClusterIP
  selector:
    app: hello-world
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
```

```bash
kubectl apply -f hello-service.yaml
```

(At this point you can access the hello-world web app by first port forwarding from your Service and then hitting localhost. But port forwarding is temporary.)

Setup an Ingress for this service that uses the letsencrypt-issuer. `hello-world-ingress.yaml`:

```yaml
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-world-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-issuer" 
spec:
  ingressClassName: haproxy
  tls:
  - hosts:
      - test.example.com
    secretName: test-edge-lab-dev-tls
  rules:
  - host: test.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hello-world-service
            port:
              number: 80
```

```bash
kubectl apply -f hello-world-ingress.yaml
```

In the above, replace test.example.com with your domain. This will automatically create a new CertificateRequest, which should result in a new Certificate if everything was configured correctly. It may take a few minutes, but you should see a successful CertificateRequest, Certificate, and Secret all setup in your cluster.

To test, you'll likely need to setup your haproxy-kubernetes-ingress external IP in your `/etc/hosts` file by adding a line that looks like this:

```
192.168.87.250  test.edge-lab.dev
```

Now you can use curl to retrieve the page:

```bash
curl https://test.example.com
```

This should return the html from the hello-world-service. You should also be able to access this from your browser.

But even after all this, your service won't be accessible from a machine that isn't on your edge-lab subnet (or explicitly routing to your subnet as configured above).

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

## Pulumi

```bash
brew install pulumi
pulumi -version
```

### Prometheus

[Getting Started - Prometheus Operator](https://prometheus-operator.dev/docs/user-guides/getting-started/)

### Curl / Troubleshoot

[How to run curl in Kubernetes (for troubleshooting) - Tutorial Works](https://www.tutorialworks.com/kubernetes-curl/)

```bash
kubectl run mycurlpod --image=curlimages/curl -i --tty -- sh
```
