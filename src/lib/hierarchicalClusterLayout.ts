/**
 * Hierarchical Cluster Layout
 * 
 * Detects connected components (clusters) in the graph and positions them
 * hierarchically based on size and connectivity.
 */

interface Node {
  id: string;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
}

interface LayoutOptions {
  width: number;
  height: number;
  clusterSpacing: number;
  nodeSpacing: number;
  minClusterSize: number;
}

interface Cluster {
  id: number;
  nodes: string[];
  edges: Edge[];
  size: number;
  centerX: number;
  centerY: number;
}

/**
 * Detect connected components using Union-Find algorithm
 */
function detectClusters(nodes: Node[], edges: Edge[]): Map<string, number> {
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  // Initialize each node as its own parent
  nodes.forEach(node => {
    parent.set(node.id, node.id);
    rank.set(node.id, 0);
  });

  // Find with path compression
  function find(id: string): string {
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!));
    }
    return parent.get(id)!;
  }

  // Union by rank
  function union(id1: string, id2: string) {
    const root1 = find(id1);
    const root2 = find(id2);

    if (root1 === root2) return;

    const rank1 = rank.get(root1)!;
    const rank2 = rank.get(root2)!;

    if (rank1 < rank2) {
      parent.set(root1, root2);
    } else if (rank1 > rank2) {
      parent.set(root2, root1);
    } else {
      parent.set(root2, root1);
      rank.set(root1, rank1 + 1);
    }
  }

  // Union all connected nodes
  edges.forEach(edge => {
    union(edge.source, edge.target);
  });

  // Map each node to its cluster ID
  const nodeToCluster = new Map<string, number>();
  const clusterIds = new Map<string, number>();
  let nextClusterId = 0;

  nodes.forEach(node => {
    const root = find(node.id);
    if (!clusterIds.has(root)) {
      clusterIds.set(root, nextClusterId++);
    }
    nodeToCluster.set(node.id, clusterIds.get(root)!);
  });

  return nodeToCluster;
}

/**
 * Build cluster objects with their nodes and edges
 */
function buildClusters(
  nodes: Node[],
  edges: Edge[],
  nodeToCluster: Map<string, number>
): Cluster[] {
  const clusterMap = new Map<number, Cluster>();

  // Initialize clusters
  nodeToCluster.forEach((clusterId, nodeId) => {
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, {
        id: clusterId,
        nodes: [],
        edges: [],
        size: 0,
        centerX: 0,
        centerY: 0,
      });
    }
    clusterMap.get(clusterId)!.nodes.push(nodeId);
  });

  // Add edges to clusters
  edges.forEach(edge => {
    const sourceCluster = nodeToCluster.get(edge.source);
    const targetCluster = nodeToCluster.get(edge.target);
    
    if (sourceCluster === targetCluster && sourceCluster !== undefined) {
      clusterMap.get(sourceCluster)!.edges.push(edge);
    }
  });

  // Calculate cluster sizes
  clusterMap.forEach(cluster => {
    cluster.size = cluster.nodes.length;
  });

  return Array.from(clusterMap.values()).sort((a, b) => b.size - a.size);
}

/**
 * Position clusters in a grid layout, with larger clusters getting more space
 */
function positionClusters(
  clusters: Cluster[],
  width: number,
  height: number,
  clusterSpacing: number
): void {
  if (clusters.length === 0) return;

  // Calculate grid dimensions based on number of clusters
  const cols = Math.ceil(Math.sqrt(clusters.length));
  const rows = Math.ceil(clusters.length / cols);

  // Calculate cell size
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  // Position each cluster in a grid cell
  clusters.forEach((cluster, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    // Center of the cell
    cluster.centerX = (col + 0.5) * cellWidth;
    cluster.centerY = (row + 0.5) * cellHeight;
  });
}

/**
 * Position nodes within a cluster using force-directed layout
 */
function positionNodesInCluster(
  cluster: Cluster,
  nodeSpacing: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  if (cluster.nodes.length === 1) {
    // Single node - place at cluster center
    positions.set(cluster.nodes[0], { x: cluster.centerX, y: cluster.centerY });
    return positions;
  }

  // Calculate cluster radius based on number of nodes
  const radius = Math.sqrt(cluster.size) * nodeSpacing;

  if (cluster.edges.length === 0) {
    // No edges - arrange in a circle
    cluster.nodes.forEach((nodeId, index) => {
      const angle = (index / cluster.nodes.length) * 2 * Math.PI;
      positions.set(nodeId, {
        x: cluster.centerX + Math.cos(angle) * radius,
        y: cluster.centerY + Math.sin(angle) * radius,
      });
    });
    return positions;
  }

  // Initialize positions randomly within cluster radius
  cluster.nodes.forEach(nodeId => {
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.random() * radius;
    positions.set(nodeId, {
      x: cluster.centerX + Math.cos(angle) * r,
      y: cluster.centerY + Math.sin(angle) * r,
    });
  });

  // Simple force-directed layout within cluster
  const iterations = 50;
  const repulsionStrength = nodeSpacing * nodeSpacing;
  const attractionStrength = 0.1;
  const damping = 0.8;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>();
    
    // Initialize forces
    cluster.nodes.forEach(nodeId => {
      forces.set(nodeId, { x: 0, y: 0 });
    });

    // Repulsion between all nodes
    for (let i = 0; i < cluster.nodes.length; i++) {
      for (let j = i + 1; j < cluster.nodes.length; j++) {
        const node1 = cluster.nodes[i];
        const node2 = cluster.nodes[j];
        const pos1 = positions.get(node1)!;
        const pos2 = positions.get(node2)!;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distSq = dx * dx + dy * dy + 0.01; // Avoid division by zero
        const force = repulsionStrength / distSq;

        const fx = (dx / Math.sqrt(distSq)) * force;
        const fy = (dy / Math.sqrt(distSq)) * force;

        forces.get(node1)!.x -= fx;
        forces.get(node1)!.y -= fy;
        forces.get(node2)!.x += fx;
        forces.get(node2)!.y += fy;
      }
    }

    // Attraction along edges
    cluster.edges.forEach(edge => {
      const pos1 = positions.get(edge.source)!;
      const pos2 = positions.get(edge.target)!;

      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const force = dist * attractionStrength * edge.strength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      forces.get(edge.source)!.x += fx;
      forces.get(edge.source)!.y += fy;
      forces.get(edge.target)!.x -= fx;
      forces.get(edge.target)!.y -= fy;
    });

    // Apply forces with damping
    cluster.nodes.forEach(nodeId => {
      const pos = positions.get(nodeId)!;
      const force = forces.get(nodeId)!;

      pos.x += force.x * damping;
      pos.y += force.y * damping;

      // Keep nodes within cluster radius
      const dx = pos.x - cluster.centerX;
      const dy = pos.y - cluster.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        pos.x = cluster.centerX + (dx / dist) * radius;
        pos.y = cluster.centerY + (dy / dist) * radius;
      }
    });
  }

  return positions;
}

/**
 * Calculate hierarchical cluster layout
 */
export function calculateHierarchicalClusterLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Record<string, { x: number; y: number }> {
  console.log('Calculating hierarchical cluster layout for', nodes.length, 'nodes');

  const positions: Record<string, { x: number; y: number }> = {};

  // Detect clusters
  const nodeToCluster = detectClusters(nodes, edges);
  const clusters = buildClusters(nodes, edges, nodeToCluster);

  console.log(`Found ${clusters.length} clusters`);
  clusters.slice(0, 10).forEach((cluster, i) => {
    console.log(`  Cluster ${i + 1}: ${cluster.size} nodes, ${cluster.edges.length} edges`);
  });

  // Position clusters
  positionClusters(clusters, options.width, options.height, options.clusterSpacing);

  // Position nodes within each cluster
  clusters.forEach(cluster => {
    const clusterPositions = positionNodesInCluster(cluster, options.nodeSpacing);
    clusterPositions.forEach((pos, nodeId) => {
      positions[nodeId] = pos;
    });
  });

  console.log('Hierarchical cluster layout complete:', Object.keys(positions).length, 'nodes positioned');

  return positions;
}
