/**
 * Magnetic Cluster Layout
 * 
 * Shows only medical conditions initially, with their connections hidden.
 * When a condition is dragged, its connected nodes move with it in a radial pattern.
 * Provides expand/collapse functionality for each cluster.
 */

interface Node {
  id: string;
  type: string;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
}

interface LayoutOptions {
  width: number;
  height: number;
  conditionSpacing: number;
  clusterRadius: number;
}

interface ClusterInfo {
  anchorId: string;
  anchorType: string;
  connectedNodes: string[];
  isExpanded: boolean;
}

/**
 * Identify anchor nodes (medical conditions, medications, providers)
 */
function identifyAnchors(nodes: Node[]): string[] {
  const anchorTypes = ['medical_condition', 'medication', 'provider', 'procedure'];
  return nodes
    .filter(node => anchorTypes.includes(node.type))
    .map(node => node.id);
}

/**
 * Build clusters around anchor nodes
 */
function buildClusters(
  nodes: Node[],
  edges: Edge[],
  anchors: string[]
): Map<string, ClusterInfo> {
  const clusters = new Map<string, ClusterInfo>();
  const nodeTypes = new Map<string, string>();
  
  nodes.forEach(node => nodeTypes.set(node.id, node.type));
  
  // Build clusters for each anchor
  anchors.forEach(anchorId => {
    const connectedNodes = new Set<string>();
    
    // Find all nodes connected to this anchor
    edges.forEach(edge => {
      if (edge.source === anchorId && !anchors.includes(edge.target)) {
        connectedNodes.add(edge.target);
      } else if (edge.target === anchorId && !anchors.includes(edge.source)) {
        connectedNodes.add(edge.source);
      }
    });
    
    clusters.set(anchorId, {
      anchorId,
      anchorType: nodeTypes.get(anchorId) || 'unknown',
      connectedNodes: Array.from(connectedNodes),
      isExpanded: false, // Start collapsed
    });
  });
  
  return clusters;
}

/**
 * Position anchor nodes in a grid
 */
function positionAnchors(
  anchors: string[],
  width: number,
  height: number,
  spacing: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  if (anchors.length === 0) return positions;
  
  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(anchors.length));
  const rows = Math.ceil(anchors.length / cols);
  
  // Calculate cell size
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  
  // Position each anchor in a grid cell
  anchors.forEach((anchorId, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    positions.set(anchorId, {
      x: (col + 0.5) * cellWidth,
      y: (row + 0.5) * cellHeight,
    });
  });
  
  return positions;
}

/**
 * Position connected nodes in a radial pattern around their anchor
 */
export function positionClusterNodes(
  anchorPos: { x: number; y: number },
  connectedNodes: string[],
  radius: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  if (connectedNodes.length === 0) return positions;
  
  // Node dimensions (approximate)
  const nodeWidth = 220;
  const nodeHeight = 56;
  const minSpacing = 40; // Minimum space between nodes
  
  // Calculate minimum radius to avoid overlap with anchor
  // Account for anchor size + connected node size + spacing
  const minRadius = Math.max(radius, (nodeWidth / 2) + (nodeWidth / 2) + minSpacing);
  
  // Arrange in concentric circles if there are many nodes
  const nodesPerRing = 8;
  const rings = Math.ceil(connectedNodes.length / nodesPerRing);
  
  connectedNodes.forEach((nodeId, index) => {
    const ring = Math.floor(index / nodesPerRing);
    const posInRing = index % nodesPerRing;
    const nodesInThisRing = Math.min(nodesPerRing, connectedNodes.length - ring * nodesPerRing);
    
    // Start at minRadius and expand outward for additional rings
    const ringRadius = minRadius + (ring * minRadius * 0.5);
    const angle = (posInRing / nodesInThisRing) * 2 * Math.PI;
    
    positions.set(nodeId, {
      x: anchorPos.x + Math.cos(angle) * ringRadius,
      y: anchorPos.y + Math.sin(angle) * ringRadius,
    });
  });
  
  return positions;
}

/**
 * Calculate magnetic cluster layout
 */
export function calculateMagneticClusterLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions,
  expandedClusters: Set<string> = new Set()
): {
  positions: Record<string, { x: number; y: number }>;
  clusters: Map<string, ClusterInfo>;
  visibleNodes: Set<string>;
} {
  console.log('Calculating magnetic cluster layout for', nodes.length, 'nodes');
  
  const positions: Record<string, { x: number; y: number }> = {};
  const visibleNodes = new Set<string>();
  
  // Identify anchor nodes
  const anchors = identifyAnchors(nodes);
  console.log(`Found ${anchors.length} anchor nodes`);
  
  // Build clusters
  const clusters = buildClusters(nodes, edges, anchors);
  
  // Position anchors
  const anchorPositions = positionAnchors(
    anchors,
    options.width,
    options.height,
    options.conditionSpacing
  );
  
  // Add anchor positions and mark as visible
  anchorPositions.forEach((pos, anchorId) => {
    positions[anchorId] = pos;
    visibleNodes.add(anchorId);
  });
  
  // Position connected nodes for expanded clusters
  expandedClusters.forEach(anchorId => {
    const cluster = clusters.get(anchorId);
    if (!cluster) return;
    
    const anchorPos = anchorPositions.get(anchorId);
    if (!anchorPos) return;
    
    // Mark cluster as expanded
    cluster.isExpanded = true;
    
    // Position connected nodes
    const connectedPositions = positionClusterNodes(
      anchorPos,
      cluster.connectedNodes,
      options.clusterRadius
    );
    
    connectedPositions.forEach((pos, nodeId) => {
      positions[nodeId] = pos;
      visibleNodes.add(nodeId);
    });
  });
  
  console.log(`Magnetic cluster layout complete: ${visibleNodes.size} visible nodes (${anchors.length} anchors, ${visibleNodes.size - anchors.length} expanded)`);
  
  return { positions, clusters, visibleNodes };
}

/**
 * Update cluster positions when anchor is dragged
 */
export function updateClusterPosition(
  anchorId: string,
  newAnchorPos: { x: number; y: number },
  cluster: ClusterInfo,
  clusterRadius: number
): Map<string, { x: number; y: number }> {
  if (!cluster.isExpanded) {
    return new Map();
  }
  
  return positionClusterNodes(newAnchorPos, cluster.connectedNodes, clusterRadius);
}
