/**
 * Iterative Refinement Layout
 * 
 * Positions nodes in multiple passes:
 * Pass 1: Hub nodes (most connected)
 * Pass 2: Their immediate neighbors
 * Pass 3: Remaining connected nodes
 * Pass 4: Isolated nodes
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
  hubRadius: number;
  neighborRadius: number;
  isolatedRadius: number;
  hubThreshold: number; // Minimum connections to be considered a hub
}

/**
 * Calculate node connectivity (number of connections)
 */
function calculateConnectivity(nodes: Node[], edges: Edge[]): Map<string, number> {
  const connectivity = new Map<string, number>();
  
  nodes.forEach(node => connectivity.set(node.id, 0));
  
  edges.forEach(edge => {
    connectivity.set(edge.source, (connectivity.get(edge.source) || 0) + 1);
    connectivity.set(edge.target, (connectivity.get(edge.target) || 0) + 1);
  });
  
  return connectivity;
}

/**
 * Get neighbors of a node
 */
function getNeighbors(nodeId: string, edges: Edge[]): Set<string> {
  const neighbors = new Set<string>();
  
  edges.forEach(edge => {
    if (edge.source === nodeId) {
      neighbors.add(edge.target);
    } else if (edge.target === nodeId) {
      neighbors.add(edge.source);
    }
  });
  
  return neighbors;
}

/**
 * Position hub nodes in the center using force-directed layout
 */
function positionHubNodes(
  hubs: string[],
  edges: Edge[],
  centerX: number,
  centerY: number,
  radius: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  if (hubs.length === 0) return positions;
  
  if (hubs.length === 1) {
    positions.set(hubs[0], { x: centerX, y: centerY });
    return positions;
  }
  
  // Initialize positions in a circle
  hubs.forEach((hubId, index) => {
    const angle = (index / hubs.length) * 2 * Math.PI;
    positions.set(hubId, {
      x: centerX + Math.cos(angle) * radius * 0.5,
      y: centerY + Math.sin(angle) * radius * 0.5,
    });
  });
  
  // Simple force-directed refinement for hubs
  const iterations = 50;
  const repulsion = 5000;
  const attraction = 0.1;
  const damping = 0.8;
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>();
    hubs.forEach(hubId => forces.set(hubId, { x: 0, y: 0 }));
    
    // Repulsion between hubs
    for (let i = 0; i < hubs.length; i++) {
      for (let j = i + 1; j < hubs.length; j++) {
        const hub1 = hubs[i];
        const hub2 = hubs[j];
        const pos1 = positions.get(hub1)!;
        const pos2 = positions.get(hub2)!;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distSq = dx * dx + dy * dy + 0.01;
        const force = repulsion / distSq;
        
        const fx = (dx / Math.sqrt(distSq)) * force;
        const fy = (dy / Math.sqrt(distSq)) * force;
        
        forces.get(hub1)!.x -= fx;
        forces.get(hub1)!.y -= fy;
        forces.get(hub2)!.x += fx;
        forces.get(hub2)!.y += fy;
      }
    }
    
    // Attraction along edges between hubs
    edges.forEach(edge => {
      if (hubs.includes(edge.source) && hubs.includes(edge.target)) {
        const pos1 = positions.get(edge.source)!;
        const pos2 = positions.get(edge.target)!;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const force = dist * attraction * edge.strength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        forces.get(edge.source)!.x += fx;
        forces.get(edge.source)!.y += fy;
        forces.get(edge.target)!.x -= fx;
        forces.get(edge.target)!.y -= fy;
      }
    });
    
    // Apply forces
    hubs.forEach(hubId => {
      const pos = positions.get(hubId)!;
      const force = forces.get(hubId)!;
      
      pos.x += force.x * damping;
      pos.y += force.y * damping;
      
      // Keep within radius
      const dx = pos.x - centerX;
      const dy = pos.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > radius) {
        pos.x = centerX + (dx / dist) * radius;
        pos.y = centerY + (dy / dist) * radius;
      }
    });
  }
  
  return positions;
}

/**
 * Position neighbors around their connected hubs
 */
function positionNeighbors(
  neighbors: string[],
  hubPositions: Map<string, { x: number; y: number }>,
  edges: Edge[],
  radius: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  neighbors.forEach(neighborId => {
    // Find connected hubs
    const connectedHubs: string[] = [];
    edges.forEach(edge => {
      if (edge.source === neighborId && hubPositions.has(edge.target)) {
        connectedHubs.push(edge.target);
      } else if (edge.target === neighborId && hubPositions.has(edge.source)) {
        connectedHubs.push(edge.source);
      }
    });
    
    if (connectedHubs.length === 0) {
      // No connected hubs, shouldn't happen but handle it
      positions.set(neighborId, { x: 0, y: 0 });
      return;
    }
    
    // Calculate average position of connected hubs
    let avgX = 0;
    let avgY = 0;
    connectedHubs.forEach(hubId => {
      const hubPos = hubPositions.get(hubId)!;
      avgX += hubPos.x;
      avgY += hubPos.y;
    });
    avgX /= connectedHubs.length;
    avgY /= connectedHubs.length;
    
    // Position at radius distance from average hub position
    const angle = Math.random() * 2 * Math.PI;
    positions.set(neighborId, {
      x: avgX + Math.cos(angle) * radius,
      y: avgY + Math.sin(angle) * radius,
    });
  });
  
  return positions;
}

/**
 * Position isolated nodes in a grid around the periphery
 */
function positionIsolatedNodes(
  isolated: string[],
  centerX: number,
  centerY: number,
  radius: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  if (isolated.length === 0) return positions;
  
  // Arrange in a circle around the periphery
  isolated.forEach((nodeId, index) => {
    const angle = (index / isolated.length) * 2 * Math.PI;
    positions.set(nodeId, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  });
  
  return positions;
}

/**
 * Calculate iterative refinement layout
 */
export function calculateIterativeRefinementLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Record<string, { x: number; y: number }> {
  console.log('Calculating iterative refinement layout for', nodes.length, 'nodes');
  
  const positions: Record<string, { x: number; y: number }> = {};
  const centerX = options.width / 2;
  const centerY = options.height / 2;
  
  // Calculate connectivity
  const connectivity = calculateConnectivity(nodes, edges);
  
  // Pass 1: Identify hub nodes (highly connected)
  const hubs: string[] = [];
  const nonHubs: string[] = [];
  
  nodes.forEach(node => {
    const connections = connectivity.get(node.id) || 0;
    if (connections >= options.hubThreshold) {
      hubs.push(node.id);
    } else {
      nonHubs.push(node.id);
    }
  });
  
  console.log(`Pass 1: Found ${hubs.length} hub nodes (threshold: ${options.hubThreshold} connections)`);
  
  // Position hubs in the center
  const hubPositions = positionHubNodes(hubs, edges, centerX, centerY, options.hubRadius);
  hubPositions.forEach((pos, nodeId) => {
    positions[nodeId] = pos;
  });
  
  // Pass 2: Identify immediate neighbors of hubs
  const hubNeighbors = new Set<string>();
  hubs.forEach(hubId => {
    const neighbors = getNeighbors(hubId, edges);
    neighbors.forEach(neighborId => {
      if (!hubs.includes(neighborId)) {
        hubNeighbors.add(neighborId);
      }
    });
  });
  
  console.log(`Pass 2: Found ${hubNeighbors.size} neighbors of hub nodes`);
  
  // Position neighbors around hubs
  const neighborPositions = positionNeighbors(
    Array.from(hubNeighbors),
    hubPositions,
    edges,
    options.neighborRadius
  );
  neighborPositions.forEach((pos, nodeId) => {
    positions[nodeId] = pos;
  });
  
  // Pass 3: Identify remaining connected nodes
  const positionedNodes = new Set([...hubs, ...Array.from(hubNeighbors)]);
  const remainingConnected: string[] = [];
  const isolated: string[] = [];
  
  nonHubs.forEach(nodeId => {
    if (positionedNodes.has(nodeId)) return;
    
    const connections = connectivity.get(nodeId) || 0;
    if (connections > 0) {
      remainingConnected.push(nodeId);
    } else {
      isolated.push(nodeId);
    }
  });
  
  console.log(`Pass 3: Found ${remainingConnected.size} remaining connected nodes`);
  
  // Position remaining connected nodes near their neighbors
  const remainingPositions = positionNeighbors(
    remainingConnected,
    new Map([...hubPositions, ...neighborPositions]),
    edges,
    options.neighborRadius * 1.5
  );
  remainingPositions.forEach((pos, nodeId) => {
    positions[nodeId] = pos;
  });
  
  // Pass 4: Position isolated nodes
  console.log(`Pass 4: Positioning ${isolated.length} isolated nodes`);
  
  const isolatedPositions = positionIsolatedNodes(
    isolated,
    centerX,
    centerY,
    options.isolatedRadius
  );
  isolatedPositions.forEach((pos, nodeId) => {
    positions[nodeId] = pos;
  });
  
  console.log('Iterative refinement layout complete:', Object.keys(positions).length, 'nodes positioned');
  
  return positions;
}
