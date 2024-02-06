## Kubernetes

[Kubernetes 101: Deploy Your First Application with MicroK8s - The New Stack](https://thenewstack.io/kubernetes-101-deploy-your-first-application-with-microk8s/)



[Getting started with Redpanda in Kubernetes](https://redpanda.com/blog/manage-clusters-k8s-streaming-data)



[Tools To Make Your Terminal DevOps and Kubernetes Friendly](https://www.linkedin.com/pulse/tools-make-your-terminal-devops-kubernetes-friendly-maryam-tavakkoli/)



```bash
# Need to create a storage class
# 'storage' is deprecated and will soon be removed. Please use 'hostpath-storage' instead
# microk8s enable storage
microk8s enable hostpath-storage
#TODO: Add this to ansible
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



Get the kubeconfig from the cluster and create an ENV variable to point to it. Like this, updating the file path as appropriate:

```bash
export KUBECONFIG=~/dev/pi5cluster/k8s/pi-kubeconfig
```

Now you can run kubectl commands against the cluster. If you want, you can change the namespace of the current context so you don't have to type `--namespace` over and over again in your commands

```bash
config set-context --current --namespace=redpanda
# switch back to the default namespace:
config set-context --current --namespace=default
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

1. Create a [Topic resource](https://docs.redpanda.com/current/manage/kubernetes/k-manage-topics/):
   
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

2. Apply the Topic resource in the same namespace as your Redpanda cluster:
   
   ```bash
   kubectl apply -f topic.yaml
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

3. Check the logs of the Redpanda Operator to confirm that the topic was created:
   
   ```bash
   kubectl logs -l app.kubernetes.io/name=operator -c manager
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   You should see that the Redpanda Operator reconciled the Topic resource.
   
   Example output
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

3. Describe the topic:
   
   ```bash
   internal-rpk topic describe twitch-chat
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   Expected output:

4. Produce a message to the topic:
   
   ```bash
   internal-rpk topic produce twitch-chat
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

5. Type a message, then press Enter:
   
   ```text
   Pandas are fabulous!
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)
   
   Example output:
   
   ```text
   Produced to partition 0 at offset 0 with timestamp 1663282629789.
   ```
   
   ![copy icon](https://docs.redpanda.com/_/img/octicons-16.svg#view-clippy)

6. Press Ctrl+C to finish producing messages to the topic.

7. Consume one message from the topic:
   
   ```bash
   internal-rpk topic consume twitch-chat --num 1
   ```
   
   
   
   ## Trying with just Helm chart instead of the Operator
   
   ```bash
   helm install redpanda redpanda/redpanda \
     --create-namespace \
     --set external.domain=customredpandadomain.local \
     --set statefulset.initContainers.setDataDirOwnership.enabled=true
   ```
   
   ## 
