#!/bin/bash
# Bootah Kubernetes Installation Script
# Deploys Bootah to a Kubernetes cluster

set -e

echo "=========================================="
echo "Bootah Kubernetes Installation"
echo "=========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    echo "⚠ Helm is not installed (optional but recommended)"
fi

echo "✓ kubectl found"
echo ""

# Check cluster connection
echo "Checking Kubernetes cluster connection..."
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    echo "   Run: kubectl config current-context"
    exit 1
fi

CLUSTER_CONTEXT=$(kubectl config current-context)
echo "✓ Connected to cluster: $CLUSTER_CONTEXT"
echo ""

# Create namespace
echo "Creating Bootah namespace..."
kubectl create namespace bootah --dry-run=client -o yaml | kubectl apply -f -

echo "✓ Namespace created"
echo ""

# Create PostgreSQL secrets
echo "Creating database secrets..."
DB_PASSWORD=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

kubectl create secret generic bootah-db-secret \
    --from-literal=username=bootah \
    --from-literal=password=$DB_PASSWORD \
    --from-literal=database=bootah \
    --namespace=bootah \
    --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic bootah-app-secret \
    --from-literal=session_secret=$SESSION_SECRET \
    --namespace=bootah \
    --dry-run=client -o yaml | kubectl apply -f -

echo "✓ Secrets created"
echo ""

# Create ConfigMap for environment
echo "Creating application configuration..."
read -p "Enter cluster IP/hostname for PXE server: " PXE_IP
PXE_IP=${PXE_IP:-bootah.default}

kubectl create configmap bootah-config \
    --from-literal=NODE_ENV=production \
    --from-literal=PORT=5000 \
    --from-literal=DEFAULT_USER_ROLE=admin \
    --from-literal=PXE_SERVER_IP=$PXE_IP \
    --from-literal=TFTP_PORT=6969 \
    --from-literal=DHCP_PORT=4067 \
    --namespace=bootah \
    --dry-run=client -o yaml | kubectl apply -f -

echo "✓ ConfigMap created"
echo ""

# Create PostgreSQL deployment
echo "Deploying PostgreSQL..."
cat << 'EOF' | kubectl apply -n bootah -f -
apiVersion: v1
kind: Service
metadata:
  name: bootah-postgres
  namespace: bootah
spec:
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: bootah-postgres
  clusterIP: None

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: bootah-postgres
  namespace: bootah
spec:
  serviceName: "bootah-postgres"
  replicas: 1
  selector:
    matchLabels:
      app: bootah-postgres
  template:
    metadata:
      labels:
        app: bootah-postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: bootah-db-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: bootah-db-secret
              key: password
        - name: POSTGRES_DB
          valueFrom:
            secretKeyRef:
              name: bootah-db-secret
              key: database
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 20Gi
EOF

echo "✓ PostgreSQL deployed"
echo ""

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=Ready pod -l app=bootah-postgres -n bootah --timeout=300s 2>/dev/null || echo "⚠ Timeout waiting for PostgreSQL"

echo ""

# Create Bootah deployment
echo "Deploying Bootah application..."
cat << 'EOF' | kubectl apply -n bootah -f -
apiVersion: v1
kind: Service
metadata:
  name: bootah-service
  namespace: bootah
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 5000
  - name: tftp
    port: 6969
    protocol: UDP
    targetPort: 6969
  - name: dhcp
    port: 4067
    protocol: UDP
    targetPort: 4067
  selector:
    app: bootah

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bootah
  namespace: bootah
spec:
  replicas: 1
  selector:
    matchLabels:
      app: bootah
  template:
    metadata:
      labels:
        app: bootah
    spec:
      containers:
      - name: bootah
        image: bootah:latest
        imagePullPolicy: Never
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: bootah-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: bootah-config
              key: PORT
        - name: DATABASE_URL
          value: "postgresql://$(DB_USER):$(DB_PASSWORD)@bootah-postgres:5432/$(DB_NAME)"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: bootah-db-secret
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: bootah-db-secret
              key: password
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: bootah-db-secret
              key: database
        - name: SESSION_SECRET
          valueFrom:
            secretKeyRef:
              name: bootah-app-secret
              key: session_secret
        - name: DEFAULT_USER_ROLE
          valueFrom:
            configMapKeyRef:
              name: bootah-config
              key: DEFAULT_USER_ROLE
        - name: PXE_SERVER_IP
          valueFrom:
            configMapKeyRef:
              name: bootah-config
              key: PXE_SERVER_IP
        - name: TFTP_PORT
          valueFrom:
            configMapKeyRef:
              name: bootah-config
              key: TFTP_PORT
        - name: DHCP_PORT
          valueFrom:
            configMapKeyRef:
              name: bootah-config
              key: DHCP_PORT
        ports:
        - name: http
          containerPort: 5000
        - name: tftp
          containerPort: 6969
          protocol: UDP
        - name: dhcp
          containerPort: 4067
          protocol: UDP
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /api/auth/user
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/auth/user
            port: 5000
          initialDelaySeconds: 15
          periodSeconds: 5
EOF

echo "✓ Bootah deployment created"
echo ""

echo "Waiting for Bootah to be ready..."
kubectl wait --for=condition=Ready pod -l app=bootah -n bootah --timeout=300s 2>/dev/null || echo "⚠ Timeout waiting for Bootah"

echo ""
echo "=========================================="
echo "✓ Kubernetes deployment complete!"
echo "=========================================="
echo ""

# Get service info
echo "Service Information:"
kubectl get svc -n bootah

echo ""
echo "Pod Status:"
kubectl get pods -n bootah

echo ""
echo "Access Bootah:"
echo "  kubectl port-forward -n bootah svc/bootah-service 5000:80 &"
echo "  Then access: http://localhost:5000"
echo ""

echo "Useful commands:"
echo "  View logs:          kubectl logs -n bootah -l app=bootah -f"
echo "  Scale replicas:     kubectl scale deployment bootah -n bootah --replicas=3"
echo "  Update deployment:  kubectl rollout restart deployment bootah -n bootah"
echo "  Get all resources:  kubectl get all -n bootah"
echo ""
echo "For more information, see SELF_HOSTING_INSTALLATION.md"
echo ""
