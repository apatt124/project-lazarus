// Force-Directed Graph Layout Algorithm
// Based on Fruchterman-Reingold algorithm with improvements

interface Node {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

interface Edge {
  source: string;
  target: string;
  strength?: number;
}

interface LayoutOptions {
  width?: number;
  height?: number;
  iterations?: number;
  nodeSpacing?: number;
  edgeLength?: number;
  repulsionStrength?: number;
  attractionStrength?: number;
  damping?: number;
}

/**
 * Calculate force-directed layout for graph nodes
 * Returns new positions for all nodes
 */
export function calculateForceDirectedLayout(
  nodes: Array<{ id: string }>,
  edges: Edge[],
  options: LayoutOptions = {}
): Record<string, { x: number; y: number }> {
  const {
    width = 1000,
    height = 800,
    iterations = 300,
    nodeSpacing = 280,
    edgeLength = 200,
    repulsionStrength = 50000,
    attractionStrength = 0.1,
    damping = 0.9,
  } = options;

  // Initialize nodes with random positions (spread across canvas)
  const layoutNodes: Node[] = nodes.map(n => ({
    id: n.id,
    x: Math.random() * width,
    y: Math.random() * height,
    vx: 0,
    vy: 0,
  }));

  const nodeMap = new Map<string, Node>();
  layoutNodes.forEach(n => nodeMap.set(n.id, n));

  // Store center for reference
  const centerX = width / 2;
  const centerY = height / 2;

  // Build adjacency map for connected components
  const adjacency = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  });

  // Run simulation
  for (let iter = 0; iter < iterations; iter++) {
    // Calculate repulsive forces between all nodes
    for (let i = 0; i < layoutNodes.length; i++) {
      const nodeA = layoutNodes[i];
      nodeA.vx = 0;
      nodeA.vy = 0;

      for (let j = 0; j < layoutNodes.length; j++) {
        if (i === j) continue;
        const nodeB = layoutNodes[j];

        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        // Stronger repulsion for very close nodes
        const minDist = nodeSpacing * 0.8;
        const effectiveDistance = Math.max(distance, minDist);

        // Repulsive force (inverse square law)
        const force = repulsionStrength / (effectiveDistance * effectiveDistance);
        nodeA.vx! += (dx / distance) * force;
        nodeA.vy! += (dy / distance) * force;
      }
    }

    // Calculate attractive forces along edges
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      // Attractive force (spring-like), stronger for high-strength edges
      const edgeStrength = edge.strength || 0.5;
      const force = attractionStrength * (distance - edgeLength) * (0.5 + edgeStrength);
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      source.vx! += fx;
      source.vy! += fy;
      target.vx! -= fx;
      target.vy! -= fy;
    });

    // Apply forces with cooling schedule
    const temperature = Math.max(0.01, 1 - (iter / iterations));
    const maxVelocity = nodeSpacing * 0.5;
    
    layoutNodes.forEach(node => {
      // Limit velocity to prevent overshooting
      const velocity = Math.sqrt(node.vx! * node.vx! + node.vy! * node.vy!);
      if (velocity > maxVelocity) {
        node.vx! = (node.vx! / velocity) * maxVelocity;
        node.vy! = (node.vy! / velocity) * maxVelocity;
      }

      node.x += node.vx! * damping * temperature;
      node.y += node.vy! * damping * temperature;

      // Keep nodes within bounds with soft boundaries
      const margin = nodeSpacing;
      if (node.x < margin) node.x = margin + (margin - node.x) * 0.1;
      if (node.x > width - margin) node.x = width - margin - (node.x - (width - margin)) * 0.1;
      if (node.y < margin) node.y = margin + (margin - node.y) * 0.1;
      if (node.y > height - margin) node.y = height - margin - (node.y - (height - margin)) * 0.1;
    });
  }

  // Convert to position map
  const positions: Record<string, { x: number; y: number }> = {};
  layoutNodes.forEach(node => {
    positions[node.id] = { x: node.x, y: node.y };
  });

  return positions;
}
