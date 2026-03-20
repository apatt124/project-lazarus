// Radial Graph Layout Algorithm
// Places hub nodes in center with connected nodes radiating outward

interface Node {
  id: string;
}

interface Edge {
  source: string;
  target: string;
  strength?: number;
}

interface LayoutOptions {
  width?: number;
  height?: number;
  centerRadius?: number;
  ringSpacing?: number;
  nodeSpacing?: number;
}

/**
 * Calculate radial layout for graph nodes
 * Hub nodes (high degree) in center, connected nodes in concentric rings
 */
export function calculateRadialLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Record<string, { x: number; y: number }> {
  const {
    width = 1000,
    height = 800,
    centerRadius = 300,
    ringSpacing = 350,
    nodeSpacing = 280,
  } = options;

  const centerX = width / 2;
  const centerY = height / 2;

  // Build adjacency map and calculate node degrees
  const adjacency = new Map<string, Set<string>>();
  const nodeDegree = new Map<string, number>();

  nodes.forEach(n => {
    adjacency.set(n.id, new Set());
    nodeDegree.set(n.id, 0);
  });

  edges.forEach(edge => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
    nodeDegree.set(edge.source, (nodeDegree.get(edge.source) || 0) + 1);
    nodeDegree.set(edge.target, (nodeDegree.get(edge.target) || 0) + 1);
  });

  // Sort nodes by degree (highest first)
  const sortedNodes = [...nodes].sort((a, b) => 
    (nodeDegree.get(b.id) || 0) - (nodeDegree.get(a.id) || 0)
  );

  // Identify hub nodes (top 20% by degree, minimum degree of 3)
  const hubThreshold = Math.max(3, Math.ceil(sortedNodes.length * 0.2));
  const hubs = sortedNodes.slice(0, hubThreshold).filter(n => (nodeDegree.get(n.id) || 0) >= 3);
  const hubIds = new Set(hubs.map(h => h.id));

  console.log(`Radial layout: ${hubs.length} hubs, ${nodes.length - hubs.length} peripheral nodes`);
  console.log(`Total nodes to place: ${nodes.length}`);

  const positions: Record<string, { x: number; y: number }> = {};
  const placed = new Set<string>();

  // Place hub nodes in center circle
  if (hubs.length === 1) {
    // Single hub at exact center
    positions[hubs[0].id] = { x: centerX, y: centerY };
    placed.add(hubs[0].id);
  } else if (hubs.length > 1) {
    // Multiple hubs in a circle around center
    const hubRadius = Math.min(centerRadius, (hubs.length * nodeSpacing) / (2 * Math.PI));
    hubs.forEach((hub, i) => {
      const angle = (i / hubs.length) * 2 * Math.PI;
      positions[hub.id] = {
        x: centerX + Math.cos(angle) * hubRadius,
        y: centerY + Math.sin(angle) * hubRadius,
      };
      placed.add(hub.id);
    });
  }

  console.log(`Placed ${placed.size} hub nodes`);

  // Place nodes connected to hubs in rings around their hub
  const ringAssignments = new Map<string, { hubId: string; ring: number }>();

  // BFS from each hub to assign ring numbers
  hubs.forEach(hub => {
    const queue: Array<{ id: string; distance: number }> = [{ id: hub.id, distance: 0 }];
    const visited = new Set<string>([hub.id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current.id) || new Set();

      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId) && !hubIds.has(neighborId)) {
          visited.add(neighborId);
          const distance = current.distance + 1;
          
          // Assign to closest hub (first one to reach it)
          if (!ringAssignments.has(neighborId)) {
            ringAssignments.set(neighborId, { hubId: hub.id, ring: distance });
          }
          
          queue.push({ id: neighborId, distance });
        }
      });
    }
  });

  // Group nodes by hub and ring
  const ringGroups = new Map<string, Map<number, string[]>>();
  hubs.forEach(hub => ringGroups.set(hub.id, new Map()));

  ringAssignments.forEach((assignment, nodeId) => {
    const hubRings = ringGroups.get(assignment.hubId)!;
    if (!hubRings.has(assignment.ring)) {
      hubRings.set(assignment.ring, []);
    }
    hubRings.get(assignment.ring)!.push(nodeId);
  });

  // Place nodes in rings around their hubs
  ringGroups.forEach((rings, hubId) => {
    const hubPos = positions[hubId];
    if (!hubPos) return;

    rings.forEach((nodeIds, ringNumber) => {
      const radius = centerRadius + ringNumber * ringSpacing;
      const angleStep = (2 * Math.PI) / nodeIds.length;

      nodeIds.forEach((nodeId, i) => {
        const angle = i * angleStep;
        positions[nodeId] = {
          x: hubPos.x + Math.cos(angle) * radius,
          y: hubPos.y + Math.sin(angle) * radius,
        };
        placed.add(nodeId);
      });
    });
  });

  console.log(`Placed ${placed.size} connected nodes (${placed.size - hubs.length} in rings)`);

  // Place any remaining unconnected nodes in outer ring
  const unplaced = nodes.filter(n => !placed.has(n.id));
  console.log(`Unplaced nodes: ${unplaced.length}`);
  
  if (unplaced.length > 0) {
    const outerRadius = centerRadius + 3 * ringSpacing;
    const angleStep = (2 * Math.PI) / unplaced.length;

    unplaced.forEach((node, i) => {
      const angle = i * angleStep;
      positions[node.id] = {
        x: centerX + Math.cos(angle) * outerRadius,
        y: centerY + Math.sin(angle) * outerRadius,
      };
    });
  }

  console.log(`Final: ${Object.keys(positions).length} nodes positioned out of ${nodes.length} total`);

  return positions;
}
