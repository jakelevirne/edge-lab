# Dev Container on K8s

#### You:

i want a container inside a kubernetes cluster that feels like a local linux development environment

#### ChatGPT:

Creating a container inside a Kubernetes cluster that functions as a local Linux development environment is a great way to leverage Kubernetes' power for development. This setup can provide a consistent, isolated, and scalable development environment that closely mirrors your production environment. Here are steps and considerations for setting this up:

### Step 1: Define Your Development Environment

Decide on the tools, languages, and services you need in your development environment. For example, you might need:

- A Linux base image (e.g., Ubuntu, Alpine).
- Development tools (e.g., text editor, compilers, debuggers).
- Language-specific SDKs (e.g., Python, Node.js, Java).
- Version control systems (e.g., Git).
- Kubernetes CLI tools (e.g., `kubectl`, `helm`).

### Step 2: Create a Dockerfile

Create a `Dockerfile` that specifies your development environment. Here's an example Dockerfile that sets up a basic environment with some common tools:

```Dockerfile
FROM ubuntu:20.04

# Avoid prompts from apt.
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    git \
    curl \
    vim \
    build-essential \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Kubernetes CLI
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Set up your default user
# Replace 1000 with your user / group id
RUN export uid=1000 gid=1000 && \
    mkdir -p /home/developer && \
    echo "developer:x:${uid}:${gid}:Developer,,,:/home/developer:/bin/bash" >> /etc/passwd && \
    echo "developer:x:${uid}:" >> /etc/group && \
    echo "developer ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/developer && \
    chmod 0440 /etc/sudoers.d/developer && \
    chown ${uid}:${gid} -R /home/developer

USER developer
ENV HOME /home/developer

WORKDIR /home/developer
```

### Step 3: Build and Push Your Container Image

Build your Docker image and push it to a container registry accessible by your Kubernetes cluster.

```sh
docker build -t your-registry/your-dev-image:latest .
docker push your-registry/your-dev-image:latest
```

### Step 4: Create a Kubernetes Deployment

Deploy your development environment to Kubernetes. You can use a Deployment, StatefulSet, or even a Pod, depending on your needs. Here's an example Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-environment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: developer-environment
  template:
    metadata:
      labels:
        app: developer-environment
    spec:
      containers:
      - name: developer-container
        image: your-registry/your-dev-image:latest
        command: ["/bin/bash"]
        tty: true
        stdin: true
```

### Step 5: Access Your Development Environment

Once deployed, access your development environment using `kubectl exec` to get an interactive shell:

```sh
kubectl exec -it $(kubectl get pod -l app=developer-environment -o jsonpath="{.items[0].metadata.name}") -- /bin/bash
```

### Considerations

- **Persistent Storage**: Consider mounting a Persistent Volume to your development environment if you need to persist data or work across sessions.
- **Security**: Ensure your development environment is secured, especially if you're accessing sensitive services or data. Use Kubernetes RBAC and network policies to restrict access as necessary.
- **Resource Limits**: Set resource requests and limits to ensure your development environment doesn't consume excessive cluster resources.

This setup provides a flexible and powerful development environment within your Kubernetes cluster, making it easier to develop, test, and deploy applications that are designed to run in Kubernetes.
