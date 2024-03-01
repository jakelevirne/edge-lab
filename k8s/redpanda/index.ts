import * as k8s from "@pulumi/kubernetes";

// Initialize a Kubernetes provider for MicroK8s without explicitly setting kubeconfig
const provider = new k8s.Provider("microk8s", {
    // kubeconfig is omitted so Pulumi will use the KUBECONFIG environment variable
});


// Update the Helm repo
// In Pulumi, repositories are automatically updated before being used,
// so we do not need a separate update command as in the Helm CLI.

// Install cert-manager from the Jetstack Helm repo
const certManager = new k8s.helm.v3.Release("cert-manager", {
    chart: "cert-manager",
    repositoryOpts: {
        repo: "https://charts.jetstack.io",
    },
    namespace: "cert-manager",
    createNamespace: true,
    values: {
        installCRDs: true,
    },
}, { provider: provider });

// Apply the Redpanda Operator CRDs using Kustomize
// This assumes you have the Kustomize configuration locally in "./redpanda-operator-crd"
const redpandaCRDs = new k8s.kustomize.Directory("redpanda-crds", {
    directory: "https://github.com/redpanda-data/redpanda-operator//src/go/k8s/config/crd?ref=v2.1.14-23.3.4",
}, { provider });

// Install the Redpanda Operator using the Helm chart
const redpandaOperator = new k8s.helm.v3.Release("redpanda-controller", {
    chart: "operator",
    repositoryOpts: {
        repo: "https://charts.redpanda.com",
    },
    namespace: "redpanda",
    createNamespace: true,
    values: {
        image: {
            tag: "v2.1.14-23.3.4",
        },
    },
}, { provider: provider });


const redpandaCluster = new k8s.apiextensions.CustomResource("redpanda-cluster", {
    apiVersion: "cluster.redpanda.com/v1alpha1",
    kind: "Redpanda",
    metadata: {
        name: "redpanda",
        namespace: "redpanda", 
    },
    spec: {
        chartRef: {},
        clusterSpec: {
            monitoring: {
                enabled: true,
                scrapeInterval: "30s",
            },
            external: {
                domain: "customredpandadomain.local",
            },
            statefulset: {
                initContainers: {
                    setDataDirOwnership: {
                        enabled: true,
                    },
                },
            },
        },
    },
}, { provider: provider });
