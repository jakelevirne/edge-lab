## Redpanda (Kafka)

[Getting started with Redpanda in Kubernetes](https://redpanda.com/blog/manage-clusters-k8s-streaming-data)

[Deploy a Local Development Cluster with kind or minikube | Redpanda Docs](https://docs.redpanda.com/current/deploy/deployment-option/self-hosted/kubernetes/local-guide/)

Copied and pasted here to make it easier to define a namespace.

**This command will make it so we don't have to specify a namespace in every kubectl command below:**

```bash
kubectl config set-context --current --namespace=redpanda
```

## Deploy Redpanda and Redpanda Console

I chose to use Helm, without the Operator, because it worked without issue.

In this step, you deploy Redpanda with self-signed TLS certificates. Redpanda Console is included as a subchart in the Redpanda Helm chart.

1. Add the Redpanda Helm chart repository and install cert-manager using Helm:

   ```bash
   helm repo add redpanda https://charts.redpanda.com
   helm repo add jetstack https://charts.jetstack.io
   helm repo update
   helm install cert-manager jetstack/cert-manager  --set installCRDs=true --namespace cert-manager  --create-namespace
   ```

   

   The Redpanda Helm chart uses cert-manager to manage TLS certificates.

2. Install Redpanda using Helm:

   ```bash
   helm repo add redpanda https://charts.redpanda.com/
   helm repo update
   helm install redpanda redpanda/redpanda \
     --namespace redpanda \
     --create-namespace \
     --set external.domain=customredpandadomain.local \
     --set statefulset.initContainers.setDataDirOwnership.enabled=true
   ```

   

   The installation displays some tips for getting started.

3. Wait for the Redpanda cluster to be ready:

   ```bash
   kubectl --namespace redpanda rollout status statefulset redpanda --watch
   ```

   

   When the Redpanda cluster is ready, the output should look similar to the following:

   ```plain
   statefulset rolling update complete 3 pods at revision redpanda-8654f645b4...
   ```

   

   If your cluster remains in a pending state, see [Troubleshoot](https://docs.redpanda.com/current/deploy/deployment-option/self-hosted/kubernetes/local-guide/#troubleshoot).

## Start streaming

Each Redpanda broker comes with `rpk`, which is a CLI tool for connecting to and interacting with Redpanda brokers. You can use `rpk` inside one of the Redpanda broker’s Docker containers to create a topic, produce messages to it, and consume messages from it.

1. Create an alias to simplify the `rpk` commands:

   ```bash
   alias internal-rpk="kubectl exec -i -t redpanda-0 -c redpanda -- rpk"
   ```

   

2. Create a topic called `twitch-chat`:

   

   ```bash
   internal-rpk topic create twitch-chat
   ```

   

3. Describe the topic:

   ```bash
   internal-rpk topic describe twitch-chat
   ```

   

4. Produce a message to the topic:

   ```bash
   internal-rpk topic produce twitch-chat
   ```

   

5. Type a message, then press Enter:

   ```text
   Pandas are fabulous!
   ```

   

   Press Ctrl+C to finish producing messages to the topic.

6. Consume one message from the topic:

   ```bash
   internal-rpk topic consume twitch-chat --num 1
   ```



Continue on with [Deploy a Local Development Cluster with kind or minikube | Redpanda Docs](https://docs.redpanda.com/current/deploy/deployment-option/self-hosted/kubernetes/local-guide/) to learn about the Repanda Console and troubleshooting.
