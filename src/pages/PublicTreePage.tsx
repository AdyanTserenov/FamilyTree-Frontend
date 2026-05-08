import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { treeService } from '../api/trees';
import { Spinner } from '../components/ui/Spinner';
import { getLayoutedElements } from '../utils/treeLayout';
import { AlignCenter, AlignLeft, TreePine } from 'lucide-react';
import type { Person } from '../types';

// ─── Node types ───────────────────────────────────────────────────────────────

type PersonNodeData = {
  person: Person;
  onClick: (p: Person) => void;
  showPhoto: boolean;
  showBirthPlace: boolean;
  direction?: string;
};

// Invisible couple node — rendered as a small pink dot with connection handles
const CoupleNode = () => (
  <div style={{ width: 8, height: 8, position: 'relative' }}>
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      style={{ opacity: 0, width: 6, height: 6, border: 'none', left: -3 }}
    />
    <Handle
      type="target"
      position={Position.Right}
      id="right"
      style={{ opacity: 0, width: 6, height: 6, border: 'none', right: -3 }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="bottom"
      style={{ opacity: 0, width: 6, height: 6, border: 'none', bottom: -3 }}
    />
    <Handle
      type="target"
      position={Position.Top}
      id="top"
      style={{ opacity: 0, width: 6, height: 6, border: 'none', top: -3 }}
    />
    <Handle
      type="target"
      position={Position.Bottom}
      id="bottom-in"
      style={{ opacity: 0, width: 6, height: 6, border: 'none', bottom: -3 }}
    />
    <Handle
      type="source"
      position={Position.Right}
      id="right-out"
      style={{ opacity: 0, width: 6, height: 6, border: 'none', right: -3 }}
    />
    <div style={{ width: 8, height: 8, background: '#ec4899', borderRadius: '50%' }} />
  </div>
);

// Custom person node — read-only (no navigation on click)
const PersonNode = ({ data }: NodeProps) => {
  const { person, onClick, showPhoto, showBirthPlace, direction = 'TB' } = data as PersonNodeData;
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
  const initials = [person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join('');
  const isMale = person.gender === 'MALE';
  const isFemale = person.gender === 'FEMALE';
  const isVertical = direction === 'TB';

  return (
    <div
      onClick={() => onClick(person)}
      className="select-none"
      style={{ width: 140 }}
    >
      <Handle
        type="target"
        position={isVertical ? Position.Top : Position.Left}
        id="parent-in"
        style={{ background: '#3b82f6', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={isVertical ? Position.Bottom : Position.Right}
        id="children-out"
        style={{ background: '#3b82f6', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={isVertical ? Position.Right : Position.Bottom}
        id="partner-right"
        style={{ background: '#ec4899', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={isVertical ? Position.Left : Position.Top}
        id="partner-left"
        style={{ background: '#ec4899', width: 8, height: 8 }}
      />

      <div
        className={`rounded-xl border-2 p-3 text-center shadow-sm bg-white ${
          isMale ? 'border-green-300' : isFemale ? 'border-pink-300' : 'border-gray-300'
        }`}
      >
        {showPhoto && person.avatarUrl ? (
          <img
            src={person.avatarUrl}
            alt={fullName}
            className="w-12 h-12 rounded-full mx-auto mb-2 object-cover"
          />
        ) : showPhoto ? (
          <div
            className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-semibold text-sm ${
              isMale ? 'bg-green-500' : isFemale ? 'bg-pink-500' : 'bg-gray-500'
            }`}
          >
            {initials || '?'}
          </div>
        ) : null}
        <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{fullName}</p>
        {person.birthDate && (
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(person.birthDate).getFullYear()}
            {person.deathDate ? ` – ${new Date(person.deathDate).getFullYear()}` : ''}
          </p>
        )}
        {showBirthPlace && person.birthPlace && (
          <p className="text-xs text-gray-400 mt-0.5 truncate" title={person.birthPlace}>
            📍 {person.birthPlace}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Layout mode type ─────────────────────────────────────────────────────────

type LayoutMode = 'TB' | 'LR';

// ─── Main component ───────────────────────────────────────────────────────────

export const PublicTreePage = () => {
  const { token } = useParams<{ token: string }>();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('TB');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicTree', token],
    queryFn: () => treeService.getPublicTree(token!),
    enabled: !!token,
  });

  const persons: Person[] = data?.data ?? [];

  // Stable nodeTypes reference
  const nodeTypes = useMemo(() => ({
    personNode: PersonNode,
    coupleNode: CoupleNode,
  }), []);

  // No-op click handler — public page is read-only
  const handlePersonClick = useMemo(() => () => {}, []);

  // Build ReactFlow nodes and edges from persons list
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!persons || persons.length === 0) return { initialNodes: [], initialEdges: [] };

    // Deduplicate relationships across all persons
    const seenIds = new Set<number>();
    const allRels = persons.flatMap((p) => p.relationships ?? []).filter((r) => {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });

    const partnerships = allRels.filter(r => r.type === 'PARTNERSHIP');
    const parentChildRels = allRels.filter(r => r.type === 'PARENT_CHILD');

    // Build couple nodes and their edges
    const coupleNodes: Node[] = [];
    const coupleEdges: Edge[] = [];
    const coupleNodeMap = new Map<string, string>();

    for (const rel of partnerships) {
      const a = Math.min(rel.person1Id, rel.person2Id);
      const b = Math.max(rel.person1Id, rel.person2Id);
      const coupleKey = `${a}-${b}`;
      const coupleId = `couple-${coupleKey}`;

      if (!coupleNodeMap.has(coupleKey)) {
        coupleNodeMap.set(coupleKey, coupleId);

        coupleNodes.push({
          id: coupleId,
          type: 'coupleNode',
          data: {},
          position: { x: 0, y: 0 },
          style: { width: 8, height: 8 },
        });

        coupleEdges.push({
          id: `edge-couple-${a}-${coupleId}`,
          source: String(a),
          sourceHandle: 'partner-right',
          target: coupleId,
          targetHandle: 'left',
          style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '6 3' },
          type: 'straight',
          animated: false,
          label: 'Партнёр',
          labelStyle: { fontSize: 11, fill: '#6b7280' },
          labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
        });

        coupleEdges.push({
          id: `edge-couple-${b}-${coupleId}`,
          source: String(b),
          sourceHandle: 'partner-right',
          target: coupleId,
          targetHandle: 'right',
          style: { stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '6 3' },
          type: 'straight',
          animated: false,
        });
      }
    }

    // Build parent-child edges, routing through couple nodes where applicable
    const childEdges: Edge[] = [];
    const seenChildEdges = new Set<string>();

    for (const rel of parentChildRels) {
      const parentId = rel.person1Id;
      const childId = rel.person2Id;

      const partnerRel = partnerships.find(
        p => p.person1Id === parentId || p.person2Id === parentId
      );

      let sourceId: string;
      let sourceHandle: string | undefined;

      if (partnerRel) {
        const a = Math.min(partnerRel.person1Id, partnerRel.person2Id);
        const b = Math.max(partnerRel.person1Id, partnerRel.person2Id);
        const coupleKey = `${a}-${b}`;
        const resolvedCoupleId = coupleNodeMap.get(coupleKey);
        if (resolvedCoupleId) {
          sourceId = resolvedCoupleId;
          sourceHandle = 'bottom';
        } else {
          sourceId = String(parentId);
        }
      } else {
        sourceId = String(parentId);
      }

      const edgeKey = `${sourceId}→${childId}`;
      if (seenChildEdges.has(edgeKey)) continue;
      seenChildEdges.add(edgeKey);

      childEdges.push({
        id: `edge-${rel.id}`,
        source: sourceId,
        ...(sourceHandle ? { sourceHandle } : { sourceHandle: 'children-out' }),
        target: String(childId),
        targetHandle: 'parent-in',
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        type: 'smoothstep',
        animated: false,
        label: 'Родитель',
        labelStyle: { fontSize: 11, fill: '#6b7280' },
        labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
      });
    }

    const initialNodes: Node[] = [
      ...persons.map((person) => ({
        id: String(person.id),
        type: 'personNode',
        data: {
          person,
          onClick: handlePersonClick,
          showPhoto: true,
          showBirthPlace: false,
        } as PersonNodeData,
        position: { x: 0, y: 0 },
      })),
      ...coupleNodes,
    ];

    const initialEdges: Edge[] = [...coupleEdges, ...childEdges];

    return { initialNodes, initialEdges };
  }, [persons, handlePersonClick]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Apply layout whenever nodes/edges or layout mode changes
  useEffect(() => {
    if (initialNodes.length > 0 || initialEdges.length > 0) {
      try {
        const { nodes: ln, edges: le } = getLayoutedElements(
          initialNodes,
          initialEdges,
          layoutMode,
          persons,
        );
        setNodes(ln);
        setEdges(le);
      } catch (err) {
        console.error('PublicTreePage: layout error:', err);
        setNodes(initialNodes);
        setEdges(initialEdges);
      }
    } else if (persons.length === 0) {
      setNodes([]);
      setEdges([]);
    }
  }, [initialNodes, initialEdges, layoutMode, persons, setNodes, setEdges]);

  // ─── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-500 text-lg">Ссылка недействительна или дерево не найдено</p>
        <Link to="/" className="text-green-600 hover:underline">На главную</Link>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-green-600 font-bold text-xl">
            <TreePine className="w-6 h-6" />
            <span>FamilyTree</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Семейное дерево</h1>
            <p className="text-sm text-gray-500">
              Публичный просмотр · {persons.length} персон
              {persons.length === 1 ? 'а' : persons.length < 5 ? 'ы' : ''}
            </p>
          </div>
        </div>

        {/* Layout mode switcher */}
        <div className="flex border border-gray-200 rounded-md overflow-hidden">
          <button
            onClick={() => setLayoutMode('TB')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              layoutMode === 'TB'
                ? 'text-gray-700 bg-gray-100 border-r border-gray-200'
                : 'text-gray-600 bg-white hover:bg-gray-50 border-r border-gray-200'
            }`}
            title="Вертикальное дерево"
          >
            <AlignCenter className="w-4 h-4" />
            <span>Верт.</span>
          </button>
          <button
            onClick={() => setLayoutMode('LR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              layoutMode === 'LR'
                ? 'text-gray-700 bg-gray-100'
                : 'text-gray-600 bg-white hover:bg-gray-50'
            }`}
            title="Горизонтальное дерево"
          >
            <AlignLeft className="w-4 h-4" />
            <span>Гориз.</span>
          </button>
        </div>
      </header>

      {/* Graph area */}
      <div className="flex-1 relative overflow-hidden min-h-0 w-full">
        {persons.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg text-gray-500">В этом дереве пока нет персон</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            key={layoutMode}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            className="w-full h-full"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-3 text-sm text-gray-400 bg-white border-t border-gray-100 flex-shrink-0">
        Семейное дерево · Только для просмотра
      </footer>
    </div>
  );
};
