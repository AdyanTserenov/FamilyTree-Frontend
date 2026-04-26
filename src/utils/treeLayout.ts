/**
 * Custom family-tree layout algorithm.
 *
 * Replaces the dagre-based implementation that was previously embedded in
 * TreePage.tsx.  The algorithm:
 *
 *  1. Assigns a "generation" (rank) to every personNode via BFS over
 *     PARENT_CHILD edges.
 *  2. Distributes personNodes within each generation along the primary axis
 *     (X in TB mode, Y in LR mode) with fixed spacing.
 *  3. Positions coupleNodes at the midpoint between their two partners.
 *  4. Centres children under (or beside) their parent coupleNode / single
 *     parent, shifting subtrees to avoid overlaps.
 *  5. Rewires edge sourceHandle / targetHandle to match the chosen mode.
 *
 * Strict order of operations (per couple):
 *   partner positions → CoupleNode primary position → children positions
 */

import type { Node, Edge } from '@xyflow/react';
import type { Person } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

// NOTE: NODE_WIDTH must match the actual rendered width of PersonNode (style={{ width: 140 }}).
// NODE_HEIGHT must match the actual rendered height of PersonNode with showPhoto=true.
// With p-3 padding (12px×2), w-12 h-12 avatar (48px) + mb-2 (8px), name (~16px), date (~14px):
// total ≈ 110px. We use 100 as a conservative estimate that keeps the coupleNode centred.
const NODE_WIDTH = 140;
const NODE_HEIGHT = 100;
const COUPLE_SIZE = 8;

/** Gap between sibling nodes along the primary axis (TB → horizontal, LR → vertical). */
const PRIMARY_GAP = 60;
/** Gap between generations along the secondary axis. */
const GENERATION_GAP = 180;

// ─── Public API ───────────────────────────────────────────────────────────────

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  mode: 'TB' | 'LR',
  // personsList is accepted for API compatibility with the old dagre-based
  // implementation (gender ordering).  We use it to enforce male-left / female-
  // right ordering in TB mode and male-top / female-bottom in LR mode.
  personsList: Person[] = [],
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const isTB = mode === 'TB';

  // ── Step 1: Classify nodes ─────────────────────────────────────────────────
  const personNodeIds = new Set(nodes.filter(n => n.type === 'personNode').map(n => n.id));
  const coupleNodeIds = new Set(nodes.filter(n => n.type === 'coupleNode').map(n => n.id));

  // ── Step 2: Build adjacency maps ───────────────────────────────────────────
  // partnershipEdges: personNode → coupleNode
  // parentChildEdges: coupleNode|personNode → personNode (child)
  const partnershipEdges: Edge[] = [];
  const parentChildEdges: Edge[] = [];

  for (const edge of edges) {
    if (coupleNodeIds.has(edge.target) && personNodeIds.has(edge.source)) {
      partnershipEdges.push(edge);
    } else if (
      (coupleNodeIds.has(edge.source) || personNodeIds.has(edge.source)) &&
      personNodeIds.has(edge.target)
    ) {
      parentChildEdges.push(edge);
    }
  }

  // couplePartners: coupleId → [personId, personId]
  const couplePartners = new Map<string, string[]>();
  for (const edge of partnershipEdges) {
    const arr = couplePartners.get(edge.target) ?? [];
    arr.push(edge.source);
    couplePartners.set(edge.target, arr);
  }

  // coupleChildren: coupleId|personId → personId[]
  const parentChildren = new Map<string, string[]>();
  for (const edge of parentChildEdges) {
    const arr = parentChildren.get(edge.source) ?? [];
    arr.push(edge.target);
    parentChildren.set(edge.source, arr);
  }

  // incomingParentEdge: personId → source (coupleId or personId)
  const incomingParentSource = new Map<string, string>();
  for (const edge of parentChildEdges) {
    incomingParentSource.set(edge.target, edge.source);
  }

  // ── Step 3: Compute generations via BFS ────────────────────────────────────
  const generation = new Map<string, number>();

  // Roots: personNodes with no incoming PARENT_CHILD edge
  const roots = [...personNodeIds].filter(id => !incomingParentSource.has(id));
  if (roots.length === 0) {
    // Fallback: treat all personNodes as roots (disconnected graph)
    personNodeIds.forEach(id => roots.push(id));
  }

  roots.forEach(id => generation.set(id, 0));

  // BFS queue contains personNode ids whose generation is already set
  const queue: string[] = [...roots];
  const visited = new Set<string>(roots);

  while (queue.length > 0) {
    const personId = queue.shift()!;
    const gen = generation.get(personId) ?? 0;

    // Find all coupleNodes this person belongs to
    const myCouples = [...couplePartners.entries()]
      .filter(([, partners]) => partners.includes(personId))
      .map(([coupleId]) => coupleId);

    // Also handle single-parent edges (personNode → personNode)
    const directChildren = parentChildren.get(personId) ?? [];
    for (const childId of directChildren) {
      if (personNodeIds.has(childId)) {
        const existing = generation.get(childId) ?? -1;
        const newGen = gen + 1;
        if (newGen > existing) {
          generation.set(childId, newGen);
        }
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push(childId);
        }
      }
    }

    for (const coupleId of myCouples) {
      const partners = couplePartners.get(coupleId) ?? [];
      // Ensure both partners have a generation
      for (const partnerId of partners) {
        if (!generation.has(partnerId)) {
          generation.set(partnerId, gen);
        }
      }

      // Children of this couple
      const children = parentChildren.get(coupleId) ?? [];
      const maxPartnerGen = Math.max(...partners.map(p => generation.get(p) ?? 0));

      for (const childId of children) {
        const existing = generation.get(childId) ?? -1;
        const newGen = maxPartnerGen + 1;
        if (newGen > existing) {
          generation.set(childId, newGen);
        }
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push(childId);
        }
      }
    }
  }

  // Assign generation 0 to any personNode still without a generation
  personNodeIds.forEach(id => {
    if (!generation.has(id)) generation.set(id, 0);
  });

  // Enforce partner parity: both partners of a couple must share the same generation
  for (const [, partners] of couplePartners) {
    if (partners.length < 2) continue;
    const maxGen = Math.max(...partners.map(p => generation.get(p) ?? 0));
    partners.forEach(p => generation.set(p, maxGen));
  }

  // ── Step 4: Group personNodes by generation ────────────────────────────────
  const genGroups = new Map<number, string[]>();
  for (const [id, gen] of generation) {
    const arr = genGroups.get(gen) ?? [];
    arr.push(id);
    genGroups.set(gen, arr);
  }

  // ── Step 5: Apply gender ordering within each generation ───────────────────
  // For each couple, ensure male comes before female along the primary axis.
  // We do this by sorting each generation group so that within a couple the
  // male partner appears first (lower index → lower primary coordinate).
  const personById = new Map<string, Person>();
  for (const p of personsList) {
    personById.set(String(p.id), p);
  }

  // Build a stable order for each generation that respects couple ordering.
  // Strategy: for each generation, collect "couple groups" and "singles",
  // then interleave them.
  const orderedByGen = new Map<number, string[]>();
  for (const [gen, ids] of genGroups) {
    // Determine which ids belong to a couple at this generation
    const coupleGroupsAtGen: string[][] = [];
    const singlesAtGen: string[] = [];
    const assignedToCouple = new Set<string>();

    for (const [, partners] of couplePartners) {
      const atThisGen = partners.filter(p => generation.get(p) === gen);
      if (atThisGen.length === 2) {
        // Order: male first, then female (or keep original order)
        const [p0, p1] = atThisGen;
        const person0 = personById.get(p0);
        const person1 = personById.get(p1);
        let ordered: string[];
        if (person0?.gender === 'MALE' && person1?.gender === 'FEMALE') {
          ordered = [p0, p1];
        } else if (person0?.gender === 'FEMALE' && person1?.gender === 'MALE') {
          ordered = [p1, p0];
        } else {
          ordered = [p0, p1];
        }
        coupleGroupsAtGen.push(ordered);
        assignedToCouple.add(p0);
        assignedToCouple.add(p1);
      }
    }

    for (const id of ids) {
      if (!assignedToCouple.has(id)) {
        singlesAtGen.push(id);
      }
    }

    // Flatten: singles first, then couple groups
    const ordered: string[] = [...singlesAtGen];
    for (const group of coupleGroupsAtGen) {
      ordered.push(...group);
    }

    orderedByGen.set(gen, ordered);
  }

  // ── Step 6: Assign primary-axis positions to personNodes ──────────────────
  // TB: primary axis = X, secondary axis = Y
  // LR: primary axis = Y, secondary axis = X
  const primaryPos = new Map<string, number>(); // personId → primary coordinate (top-left)

  const nodeSize = isTB ? NODE_WIDTH : NODE_HEIGHT;
  const nodeStep = nodeSize + PRIMARY_GAP;

  for (const [, ids] of orderedByGen) {
    ids.forEach((id, idx) => {
      primaryPos.set(id, idx * nodeStep);
    });
  }

  // ── Step 7: Compute CoupleNode primary positions, then centre children ─────
  //
  // Strict order of operations per couple:
  //   1. Partners already have their primaryPos from Step 6.
  //   2. Compute the CoupleNode's primary-axis centre = midpoint of partners' centres.
  //   3. Place children evenly centred under that CoupleNode centre.
  //
  // We process generations top-down (0 → maxGen) so that parent couples are
  // fully positioned before their children's generation is processed.

  // couplePrimaryCenter: coupleId → primary-axis centre coordinate of the coupleNode
  const couplePrimaryCenter = new Map<string, number>();

  const maxGen = Math.max(...[...generation.values()], 0);

  for (let gen = 0; gen <= maxGen; gen++) {
    const ids = orderedByGen.get(gen) ?? [];

    // ── 7a: Compute CoupleNode primary centres for all couples at this generation
    for (const [coupleId, partners] of couplePartners) {
      const atThisGen = partners.filter(p => generation.get(p) === gen);
      if (atThisGen.length < 2) continue;

      // CoupleNode centre = midpoint of the two partners' node centres
      const p0Centre = (primaryPos.get(atThisGen[0]) ?? 0) + nodeSize / 2;
      const p1Centre = (primaryPos.get(atThisGen[1]) ?? 0) + nodeSize / 2;
      const coupleCenter = (p0Centre + p1Centre) / 2;
      couplePrimaryCenter.set(coupleId, coupleCenter);

      // ── 7b: Place children evenly centred under this CoupleNode
      const children = parentChildren.get(coupleId) ?? [];
      if (children.length === 0) continue;

      const childCount = children.length;
      const totalChildrenWidth = childCount * nodeSize + (childCount - 1) * PRIMARY_GAP;
      const firstChildPrimary = coupleCenter - totalChildrenWidth / 2;

      for (let i = 0; i < childCount; i++) {
        primaryPos.set(children[i], firstChildPrimary + i * nodeStep);
      }
    }

    // ── 7c: Handle single parents (personNode → personNode direct edges)
    for (const personId of ids) {
      const directChildren = (parentChildren.get(personId) ?? []).filter(c => personNodeIds.has(c));
      if (directChildren.length === 0) continue;

      const parentCentre = (primaryPos.get(personId) ?? 0) + nodeSize / 2;
      const childCount = directChildren.length;
      const totalChildrenWidth = childCount * nodeSize + (childCount - 1) * PRIMARY_GAP;
      const firstChildPrimary = parentCentre - totalChildrenWidth / 2;

      for (let i = 0; i < childCount; i++) {
        primaryPos.set(directChildren[i], firstChildPrimary + i * nodeStep);
      }
    }
  }

  // ── Step 8: Build final position map ──────────────────────────────────────
  const posMap = new Map<string, { x: number; y: number }>();

  for (const [id, gen] of generation) {
    const primary = primaryPos.get(id) ?? 0;
    const secondary = gen * ((isTB ? NODE_HEIGHT : NODE_WIDTH) + GENERATION_GAP);
    posMap.set(id, isTB ? { x: primary, y: secondary } : { x: secondary, y: primary });
  }

  // ── Step 9: Position coupleNodes ──────────────────────────────────────────
  for (const [coupleId, partners] of couplePartners) {
    if (partners.length < 2) {
      // Single partner: place at that partner's position
      const pos = posMap.get(partners[0]);
      if (pos) posMap.set(coupleId, pos);
      continue;
    }

    const pos0 = posMap.get(partners[0]);
    const pos1 = posMap.get(partners[1]);
    if (!pos0 || !pos1) continue;

    if (isTB) {
      // Partners are side-by-side → coupleNode exactly centred between partners' visual centres.
      // Formula: (partner1.x + partner2.x) / 2 + (NODE_WIDTH - COUPLE_SIZE) / 2
      const coupleX = (pos0.x + pos1.x) / 2 + (NODE_WIDTH - COUPLE_SIZE) / 2;
      posMap.set(coupleId, {
        x: coupleX,
        y: pos0.y + NODE_HEIGHT / 2 - COUPLE_SIZE / 2,
      });
    } else {
      // Partners are stacked → coupleNode centred horizontally on the partner nodes,
      // and centred vertically between partners' visual centres.
      // coupleX: horizontal centre of the partner nodes
      // coupleY: midpoint of partners' node centres
      const coupleX = pos0.x + NODE_WIDTH / 2 - COUPLE_SIZE / 2;
      const coupleY = (pos0.y + pos1.y) / 2 + (NODE_HEIGHT - COUPLE_SIZE) / 2;
      posMap.set(coupleId, {
        x: coupleX,
        y: coupleY,
      });
    }
  }

  // ── Step 10: Apply positions to nodes ─────────────────────────────────────
  const layoutedNodes = nodes.map(node => {
    const pos = posMap.get(node.id);
    return {
      ...node,
      position: pos ?? node.position,
      data: node.type === 'personNode'
        ? { ...node.data, direction: mode }
        : node.data,
    };
  });

  // ── Step 11: Rewire edge handles ──────────────────────────────────────────
  const layoutedEdges = edges.map(edge => {
    // Partnership edge: personNode → coupleNode
    if (coupleNodeIds.has(edge.target) && personNodeIds.has(edge.source)) {
      if (isTB) {
        const personPos = posMap.get(edge.source);
        const couplePos = posMap.get(edge.target);
        // Person whose centre is ≤ couple centre is the "left" partner
        const isLeft = personPos && couplePos
          ? (personPos.x + NODE_WIDTH / 2) <= (couplePos.x + COUPLE_SIZE / 2)
          : true;
        return {
          ...edge,
          sourceHandle: isLeft ? 'partner-right' : 'partner-left',
          targetHandle: isLeft ? 'left' : 'right',
        };
      } else {
        // LR mode: partners stacked vertically
        const personPos = posMap.get(edge.source);
        const couplePos = posMap.get(edge.target);
        // Person whose centre is ≤ couple centre is the "top" partner
        const isTop = personPos && couplePos
          ? (personPos.y + NODE_HEIGHT / 2) <= (couplePos.y + COUPLE_SIZE / 2)
          : true;
        return {
          ...edge,
          sourceHandle: isTop ? 'partner-right' : 'partner-left',
          targetHandle: isTop ? 'top' : 'bottom-in',
          type: 'straight',
          style: { stroke: '#ec4899', strokeDasharray: '5,5', strokeWidth: 2 },
        };
      }
    }

    // Parent-child edge: coupleNode → personNode
    if (coupleNodeIds.has(edge.source) && personNodeIds.has(edge.target)) {
      if (isTB) {
        return {
          ...edge,
          sourceHandle: 'bottom',
          targetHandle: 'parent-in',
        };
      } else {
        return {
          ...edge,
          sourceHandle: 'right-out',
          targetHandle: 'parent-in',
          type: 'smoothstep',
          style: { stroke: '#3b82f6', strokeWidth: 2 },
        };
      }
    }

    // Single-parent edge: personNode → personNode
    if (personNodeIds.has(edge.source) && personNodeIds.has(edge.target)) {
      if (isTB) {
        return {
          ...edge,
          sourceHandle: 'children-out',
          targetHandle: 'parent-in',
        };
      } else {
        return {
          ...edge,
          sourceHandle: 'children-out',
          targetHandle: 'parent-in',
        };
      }
    }

    return edge;
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
